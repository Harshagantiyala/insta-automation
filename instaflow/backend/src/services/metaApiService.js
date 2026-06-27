const axios = require('axios');
const config = require('../config/env');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const GRAPH_BASE = `https://graph.facebook.com/${config.meta.graphVersion}`;

/**
 * Thin wrapper around the Meta Graph API for everything InstaFlow needs:
 * OAuth code exchange, long-lived token management, sending Instagram DMs,
 * and reading comment/media metadata.
 *
 * All network calls go through `withRetry` so transient 5xx/429s from Meta
 * don't immediately blow up a webhook-triggered job.
 */
class MetaApiService {
  constructor() {
    this.appId = config.meta.appId; // <-- set META_APP_ID in .env
    this.appSecret = config.meta.appSecret; // <-- set META_APP_SECRET in .env
  }

  // ---------------------------------------------------------------------
  // OAuth
  // ---------------------------------------------------------------------

  /** Builds the URL the frontend redirects users to for "Login with Facebook". */
  getOAuthDialogUrl(state) {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: config.meta.oauthRedirectUri,
      state, // CSRF token, verified on callback
      scope: [
        'pages_show_list',
        'pages_messaging',
        'pages_manage_metadata',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_manage_messages',
        'instagram_manage_comments',
        'business_management',
      ].join(','),
      response_type: 'code',
    });
    return `https://www.facebook.com/${config.meta.graphVersion}/dialog/oauth?${params.toString()}`;
  }

  /** Step 1: exchange the OAuth `code` for a short-lived user access token. */
  async exchangeCodeForShortLivedToken(code) {
    return withRetry(async () => {
      const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: config.meta.oauthRedirectUri,
          code,
        },
      });
      return data.access_token; // short-lived (~1-2h)
    });
  }

  /** Step 2: upgrade a short-lived token into a long-lived one (~60 days). */
  async getLongLivedToken(shortLivedToken) {
    return withRetry(async () => {
      const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });
      // data.expires_in is in seconds (~5,184,000 for 60 days)
      return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
    });
  }

  /**
   * Long-lived Page/User tokens can be refreshed again before they expire by
   * calling the same fb_exchange_token grant with the CURRENT long-lived
   * token. Meta will issue a fresh 60-day token if the current one still has
   * a couple of days left on it.
   */
  async refreshLongLivedToken(currentLongLivedToken) {
    return this.getLongLivedToken(currentLongLivedToken);
  }

  /** Fetches the Facebook Pages the authenticated user manages. */
  async getUserPages(userAccessToken) {
    return withRetry(async () => {
      const { data } = await axios.get(`${GRAPH_BASE}/me/accounts`, {
        params: { access_token: userAccessToken, fields: 'id,name,access_token' },
      });
      return data.data; // [{ id, name, access_token }]
    });
  }

  /** Resolves the Instagram Business Account linked to a given Facebook Page. */
  async getInstagramAccountForPage(pageId, pageAccessToken) {
    return withRetry(async () => {
      const { data } = await axios.get(`${GRAPH_BASE}/${pageId}`, {
        params: { fields: 'instagram_business_account{id,username}', access_token: pageAccessToken },
      });
      return data.instagram_business_account; // { id, username } or undefined if not linked
    });
  }

  // ---------------------------------------------------------------------
  // Sending messages
  // ---------------------------------------------------------------------

  /**
   * Sends a DM via the Instagram Messaging API.
   * `pageId` = the Facebook Page ID linked to the Instagram Business Account.
   * `recipientIgId` = the IGSID of the person receiving the message.
   */
  async sendDirectMessage({ pageId, accessToken, recipientIgId, text }) {
    if (accessToken && accessToken.startsWith('mock_access_token_')) {
      logger.info(`[mock-meta] Simulated sending DM to ${recipientIgId}: "${text}"`);
      return { recipient_id: recipientIgId, message_id: 'mock_msg_' + Math.random().toString(36).substr(2, 9) };
    }
    return withRetry(async () => {
      const { data } = await axios.post(
        `${GRAPH_BASE}/${pageId}/messages`,
        {
          recipient: { id: recipientIgId },
          message: { text },
        },
        { params: { access_token: accessToken } }
      );
      return data; // { recipient_id, message_id }
    });
  }

  /** Privately replies to a specific comment (used for Comment-to-DM triggers). */
  async sendPrivateReplyToComment({ commentId, accessToken, text }) {
    if (accessToken && accessToken.startsWith('mock_access_token_')) {
      logger.info(`[mock-meta] Simulated sending Private Reply to comment ${commentId}: "${text}"`);
      return { success: true };
    }
    return withRetry(async () => {
      const { data } = await axios.post(
        `${GRAPH_BASE}/${commentId}/private_replies`,
        { message: text },
        { params: { access_token: accessToken } }
      );
      return data;
    });
  }

  // ---------------------------------------------------------------------
  // Reading metadata
  // ---------------------------------------------------------------------

  async getCommentDetails(commentId, accessToken) {
    return withRetry(async () => {
      const { data } = await axios.get(`${GRAPH_BASE}/${commentId}`, {
        params: { fields: 'id,text,from,media', access_token: accessToken },
      });
      return data;
    });
  }

  // ---------------------------------------------------------------------
  // Webhook subscription management (one-time setup per Page)
  // ---------------------------------------------------------------------

  async subscribePageToWebhooks(pageId, pageAccessToken) {
    return withRetry(async () => {
      await axios.post(
        `${GRAPH_BASE}/${pageId}/subscribed_apps`,
        null,
        {
          params: {
            access_token: pageAccessToken,
            subscribed_fields: 'feed,mention,comments,story_mentions',
          },
        }
      );
    });
  }

  /** Retrieves the recent media/reels of an Instagram user account. */
  async getInstagramMedia(igUserId, accessToken, igUsername = 'unknown') {
    if (accessToken && accessToken.startsWith('mock_access_token_')) {
      const handle = `@${igUsername}`;
      // Deterministic seed so the same account always gets the same mock IDs
      const seed = igUsername.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const mockId = (n) => `mock_${igUsername}_media_${seed + n}`;
      const mockPermalink = (n) => `https://www.instagram.com/p/${igUsername}${seed + n}/`;

      return [
        {
          id: mockId(1),
          caption: `New reel just dropped! 🎬✨ Follow ${handle} for more content like this. Drop a 🔥 in the comments!`,
          media_type: 'VIDEO',
          media_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300',
          permalink: mockPermalink(1),
          thumbnail_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300',
          timestamp: new Date().toISOString(),
        },
        {
          id: mockId(2),
          caption: `Comment "LINK" below and ${handle} will DM you the full version! 🙌🎉 #reels #viral`,
          media_type: 'VIDEO',
          media_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300',
          permalink: mockPermalink(2),
          thumbnail_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: mockId(3),
          caption: `Behind the scenes with ${handle} 🎥 — type "BTS" in the comments to get exclusive access 👇`,
          media_type: 'IMAGE',
          media_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300',
          permalink: mockPermalink(3),
          thumbnail_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: mockId(4),
          caption: `${handle} appreciation post 💜 — comment your fav emoji and I'll DM you a surprise! 🎁`,
          media_type: 'VIDEO',
          media_url: 'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=300',
          permalink: mockPermalink(4),
          thumbnail_url: 'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=300',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: mockId(5),
          caption: `Drop "INFO" below and ${handle} will send you all the details 🔗💡 #automation #instagram`,
          media_type: 'IMAGE',
          media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300',
          permalink: mockPermalink(5),
          thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300',
          timestamp: new Date(Date.now() - 345600000).toISOString(),
        },
      ];
    }
    return withRetry(async () => {
      const { data } = await axios.get(`${GRAPH_BASE}/${igUserId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
          access_token: accessToken,
          limit: 20
        },
      });
      return data.data || [];
    });
  }

  /** Sends a public reply to an existing comment. */
  async sendPublicCommentReply({ commentId, accessToken, text }) {
    if (accessToken && accessToken.startsWith('mock_access_token_')) {
      logger.info(`[mock-meta] Simulated public comment reply to comment ${commentId}: "${text}"`);
      return { id: 'mock_reply_' + Math.random().toString(36).substr(2, 9) };
    }
    return withRetry(async () => {
      const { data } = await axios.post(
        `${GRAPH_BASE}/${commentId}/replies`,
        { message: text },
        { params: { access_token: accessToken } }
      );
      return data;
    });
  }
}

module.exports = new MetaApiService();
