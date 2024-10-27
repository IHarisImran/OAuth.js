// Note: Facebook oAuth gives token expiry time (after how many seconds will the tokens get expired).

const oauthClientSecret = require("../secrets/facebook-oauth-client-secret.json");

const { appId, appSecret, redirectURL: [liveRedirectURL, localRedirectURL] } = oauthClientSecret,
    oAuthRedirect = NODE_ENV == "development" ? localRedirectURL : liveRedirectURL,
    requiredScopes = []; // Array of strings of the scopes.

// This function refreshes the tokens
const _refreshToken = async shortLivedToken => {
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
        if (!res.ok) throw new Error("Failed to refresh the token");
        let { error, access_token } = await res.json(); // these are refreshed tokens. Returns same object as received while verifying auth redirect code.
        if (error?.message) throw new Error(error?.message);
        return { success: true, response: access_token };
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message };
    };
};

// This functions checks if token is expired or not.
const _checkIfFacebookTokensAreExpired = async ({ pageToken, pageTokenExpiry }) => {
    try {
        let newToken;
        if (new Date() > pageTokenExpiry) {
            const { success, response } = await _refreshToken(pageToken);
            newToken = response;
            if (!success) throw new Error(response)
            else {
                const resp = await _getTokenExpiry(response);
                if (!resp.success) {
                    throw new Error(resp.response);
                };
                newToken.expires_in = resp.response;
            };
        };

        return { success: true, response: newToken };
    } catch (err) {
        console.log(err);
        return { success: false, response: err.message };
    };
};

// Get the expiry of tokens.
const _getTokenExpiry = async accessToken => {
    const res = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
    if (!res.ok) throw new Error("Failed to validate token.");
    const { data: { error, data_access_expires_at, scopes, is_valid } } = await res.json();
    if (error) return { success: false, response: error?.message || "Failed to get the token expiry." };
    if (!is_valid) return { success: false, response: "Token isn't valid." };

    for (let i = 0; i < requiredScopes.length; i++) { if (!scopes.includes(requiredScopes[i])) return { success: false, response: "Please grant all the permissions." } };

    let dataAccessExpiresAtMillis = data_access_expires_at * 1000;
    return { success: true, response: dataAccessExpiresAtMillis };
};

// This function generates auth url.
const _getFacebookAuthUrl = () => { return { success: true, response: `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectURL}&scope=public_profile,${requiredScopes.join(",")}` } };

// This function verifies the auth redirect code and generates the access tokesn.
const _generateFacebookToken = async code => {
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${oAuthRedirect}&client_secret=${appSecret}&code=${code}`);
        if (!res.ok) throw new Error("Failed to verify the auth code.");
        let { error, access_token } = await res.json();
        if (error?.message) throw new Error(error?.message);

        const pageRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${access_token}`);
        if (!pageRes.ok) throw new Error("Failed to fetch user's pages.");
        let pageData = await pageRes.json();
        if (pageData?.error?.message) throw new Error(pageData.error.message);
        pageData = pageData?.data[0];
        {
            if (!pageData) throw new Error("Page data not found.");
            const { access_token, id, name } = pageData;
            if (!access_token || !id || !name) throw new Error("Failed to get the page data.");
        }

        let igAccountId;
        {
            const instagramRes = await fetch(`https://graph.facebook.com/v20.0/${pageData?.id}?fields=instagram_business_account,username&access_token=${pageData?.access_token}`),
                { error, instagram_business_account } = await instagramRes.json();
            if (error?.message) throw new Error(error.message);
            igAccountId = instagram_business_account?.id;
        }

        let pageTokenExpiry = await _getTokenExpiry(pageData?.access_token);
        {
            const { success, response } = pageTokenExpiry;
            if (!success) throw new Error(response);
            pageTokenExpiry = response;
        }

        console.log({
            access_token: pageData?.access_token,
            expires_in: pageTokenExpiry,
            channelId: pageData?.id
        }); // Facebook tokens

        console.log({
            channelId: igAccountId
        }); // Instagram tokens

        return { success: true, response: null };
    } catch (err) {
        console.log(err);
        return { success: false, response: err.message };
    };
};