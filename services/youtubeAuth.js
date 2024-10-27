// Note: Google oAuth gives token expiry date in future (when the token wil get expired).

const { google } = require('googleapis'),
    oauthClientSecret = require("../secrets/gcp-oauth-client-secret.json");

const { web: { client_id, client_secret, redirect_uris: [liveRedirectURL, localRedirectURL] } } = oauthClientSecret,
    oAuth2Client = new google.auth.OAuth2(client_id, client_secret, NODE_ENV == "development" ? localRedirectURL : liveRedirectURL),
    requiredScope = []; // Array of strings of the scopes.

// This function refreshes the token
const _refreshToken = async prevTokens => {
    return new Promise((resolve, reject) => {
        oAuth2Client.setCredentials({ access_token: prevTokens.accessToken, refresh_token: prevTokens.refreshToken });
        oAuth2Client.refreshAccessToken(async (err, tokens) => {
            if (err) {
                console.log(err);
                return resolve({ success: false, response: "Failed to refresh the token." });
            };

            console.log(tokens) // these are refreshed tokens. Returns same object as received while verifying auth redirect code.

            return resolve({ success: true, response: tokens });
        });
    });
};

// This functions checks if token is expired or not.
const _checkIfYouTubeTokensAreExpired = async ({ tokenExpiry, refreshToken, accessToken }) => {
    try {
        if (tokenExpiry <= Date.now()) {
            if (!refreshToken) throw new Error("Refresh token is missing to renew the expired token.")
            else {
                const { success, response } = await _refreshToken({ refreshToken, accessToken });
                if (!success) throw new Error(response);
            };
        };

        return { success: true, response: null };
    } catch (err) {
        console.log(err);
        return { success: false, response: err.message };
    };
};

// This function generates auth url.
const _generateYouTubeAuthURL = () => {
    try {
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: requiredScope });
        return { success: true, response: authUrl };
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message };
    };
};

// This function verifies the auth redirect code and generates the access tokesn.
const _generateYouTubeToken = code => {
    return new Promise((resolve, reject) => {
        oAuth2Client.getToken(code, async (err, tokens) => {
            if (err) {
                console.log(err);
                return resolve({ success: false, response: "Failed to authenticate the code." });
            };

            const formattedScopes = tokens?.scope?.split(" ");
            for (let i = 0; i < requiredScope.length; i++) { if (!formattedScopes.includes(requiredScope[i])) return resolve({ success: false, response: "Please grant all the permissions." }) };

            console.log(tokens); // It will return access token, access token's expiry, refresh token, and accepted scopes;

            resolve({ success: true, response: null });
        });
    });
};