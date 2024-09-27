// Note: Facebook oAuth gives token expiry time (after how many seconds will the tokens get expired).

const oauthClientSecret = require("../secrets/facebook-oauth-client-secret.json");

const { appId, appSecret, redirectURL } = oauthClientSecret,
    requiredScopes = [];

// This function refreshes the tokens
const _refreshToken = async tokens => {
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
        if (!res.ok) throw new Error("Failed to refresh the token");
        let { error, access_token, expires_in } = await res.json(); // these are refreshed tokens. Returns same object as received while verifying auth redirect code.
        if (error?.message) throw new Error(error?.message);

        // converting seconds to eposh timestamp
        if (expires_in) {
            let date = new Date();
            date.setSeconds(date.getSeconds() + expires_in);
            expires_in = date.getTime();
        };

        
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message };
    };
};

// This functions checks if token is expired or not.
const _checkIfFacebookTokensAreExpired = async tokenExpiry => {
    try {
        // 0: token not expired || 1: token is expired

        let statusCode = 0;
        const now = Date.now();
        if (now > tokenExpiry) statusCode = 1;
        return { success: true, response: statusCode };
    } catch (err) {
        console.log(err);
        return { success: false, response: err.message };
    };
};

// This function generates auth url.
const _getFacebookAuthUrl = () => { return { success: true, response: `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectURL}&scope=public_profile,${requiredScopes.join(",")}` } };

// This function verifies the auth redirect code and generates the access tokesn.
const _generateFacebookToken = async code => {
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectURL}&client_secret=${appSecret}&code=${code}`);

        if (!res.ok) throw new Error("Failed to verify the auth code.");
        let { error, access_token, expires_in } = await res.json(); // gives access token and its expiry.
        if (error?.message) throw new Error(error?.message);

        // converting seconds to eposh timestamp
        if (expires_in) {
            let date = new Date();
            date.setSeconds(date.getSeconds() + expires_in);
            expires_in = date.getTime();
        };
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message }
    };
};
