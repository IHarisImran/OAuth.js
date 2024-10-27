// Note: TikTok oAuth gives token expiry time (after how many seconds will the tokens get expired).

const oauthClientSecret = require("../secrets/tiktok-oauth-client-secret.json"),
    { createHash } = require('node:crypto');

const { clientKey, clientSecret, redirectURL } = oauthClientSecret,
    requiredScopes = []; // Array of strings of the scopes.

// This function refreshes the tokens
const _refreshToken = async tokens => {
    try {
        const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache"
            },
            body: new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                grant_type: "refresh_token",
                refresh_token: tokens.refreshToken
            }).toString(),
        });

        if (response.status !== 200) throw new Error("Failed to generate the access tokens");
        const data = await response.json();

        if (data.error_description) { throw new Error(data.error_description) }
        else {
            let { expires_in, refresh_expires_in, scope } = data;

            for (let i = 0; i < requiredScopes.length; i++) {
                if (!scope.includes(requiredScopes[i])) {
                    throw new Error("Please grant all the permissions.");
                };
            };

            // converting seconds to eposh timestamp
            if (expires_in) {
                let date = new Date();
                date.setSeconds(date.getSeconds() + expires_in);
                data.expires_in = date.getTime();
            };

            // converting seconds to eposh timestamp
            if (refresh_expires_in) {
                let date = new Date();
                date.setSeconds(date.getSeconds() + refresh_expires_in);
                data.refresh_expires_in = date.getTime();
            };

            console.log(data) // these are refreshed tokens. Returns same object as received while verifying auth redirect code. The only change is, the expiry dates are converted into eposh timestamp.

            return { success: true, response: data };
        };
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message };
    };
};

// This functions checks if token is expired or not.
const _checkIfTikTokTokensAreExpired = async ({ tokenExpiry, refreshExpiry, refreshToken }) => {
    try {
        let newToken;
        const now = Date.now();

        if (now > tokenExpiry) {
            if (!refreshToken) throw new Error("Refresh token is missing to renew the expired token.")
            else {
                const { success, response } = await _refreshToken({ refreshToken });
                if (!success) throw new Error(response);
                newToken = response.access_token;
            };
        };

        return { success: true, response: newToken };
    } catch (err) {
        console.log(err);
        return { success: false, response: err.message };
    };
};

// This function generates auth url.
const _getTiktokAuthUrl = () => {
    try {
        const csrfState = Math.random().toString(36).substring(2),
            codeVerifier = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
            codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
        let url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=user.info.basic,${requiredScopes.join(",")}&response_type=code&redirect_uri=${redirectURL}&state=${csrfState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        return { success: true, response: url };
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message };
    };
};

// This function verifies the auth redirect code and generates the access tokesn.
const _generateTikTokToken = async code => {
    try {
        const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache"
            },
            body: new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                code: decodeURI(code),
                grant_type: "authorization_code",
                redirect_uri: redirectURL,
            }).toString()
        });

        if (response.status !== 200) throw new Error("Failed to generate the access tokens");
        const data = await response.json();
        if (data.error_description) { throw new Error(data.error_description) }
        else {
            let { expires_in, refresh_expires_in, scope } = data;

            for (let i = 0; i < requiredScopes.length; i++) {
                if (!scope.includes(requiredScopes[i])) {
                    throw new Error("Please grant all the permissions.");
                };
            };

            // converting seconds to eposh timestamp
            if (expires_in) {
                let date = new Date();
                date.setSeconds(date.getSeconds() + expires_in);
                data.expires_in = date.getTime();
            };

            // converting seconds to eposh timestamp
            if (refresh_expires_in) {
                let date = new Date();
                date.setSeconds(date.getSeconds() + refresh_expires_in);
                data.refresh_expires_in = date.getTime();
            };

            console.log(data) // It will return access token, access token's expiry, refresh token refresh token's expiry, and accepted scopes;

            return { success: true, response: null };
        };
    } catch (err) {
        console.log(err)
        return { success: false, response: err.message };
    };
};