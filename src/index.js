import qs from 'qs';
import request from 'superagent';

const AUTH_URL = 'https://auth.getmondo.co.uk/';
const API_URL = 'https://api.monzo.com/';

/** Class that contains the api */
class MonzoApi {
    /**
     * Set the clientId value.
     * @param {string} value - The clientId value.
     */
    set clientId(value) {
        this._clientId = value;
    }

    /**
     * Get the clientId value.
     * @return {string} The clientId value.
     */
    get clientId() {
        return this._clientId;
    }

    /**
     * Set the clientSecret value.
     * @param {string} value - The clientSecret value.
     */
    set clientSecret(value) {
        this._clientSecret = value;
    }

    /**
     * Get the clientSecret value.
     * @return {string} The clientSecret value.
     */
    get clientSecret() {
        return this._clientSecret;
    }

    /**
     * Set the redirectUrl value.
     * @param {string} value - The redirectUrl value.
     */
    set redirectUrl(value) {
        this._redirectUrl = value;
    }

    /**
     * Get the redirectUrl value.
     * @return {string} The redirectUrl value.
     */
    get redirectUrl() {
        return this._redirectUrl;
    }

    /**
     * Set the refreshToken value.
     * @param {string} value - The refreshToken value.
     */
    set refreshToken(value) {
        this._refreshToken = value;
    }

    /**
     * Get the refreshToken value.
     * @return {string} The refreshToken value.
     */
    get refreshToken() {
        this._refreshToken;
    }

    /**
     * Set the accessToken value.
     * @param {string} value - The accessToken value.
     */
    set accessToken(value) {
        this._accessToken = value;
    }

    /**
     * Get the accessToken value.
     * @return {string} The accessToken value.
     */
    get accessToken() {
        return this._accessToken;
    }

    /**
     * Get the code value. It will be set when authenticate method gets called
     * @return {string} The code value.
     */
    get code() {
        return this._code;
    }

    /**
     * Get the stateToken value.
     * Value that will be matched against the one provided when a user authenticates.
     * The values must match otherwise the authentication won't proceed
     * @return {string} The stateToken value.
     */
    get stateToken() {
        this._stateToken = Math.random().toString(36).replace(/[^a-z]+/g, '');
        return this._stateToken;
    }

    /**
     * Get the authorizationUrl value.
     * The user needs to be redirected to this url in order to authenticate
     * @return {string} The authorizationUrl value.
     */
    get authorizationUrl() {
        const data = {
            client_id: this.clientId,
            redirect_uri: this.redirectUrl,
            response_type: 'code',
            state: this.stateToken
        };
        return `${AUTH_URL}?${qs.stringify(data)}`;
    }

    /**
     * Create a monzo api instance.
     * @param {string} clientId - The client id value.
     * @param {string} clientSecret - The client secret value.
     */
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * Authenticate the user given the code and the stateToken
     * found in the query string of the redirectUrl
     * @param {string} code - The code value.
     * @param {string} stateToken - The state token value.
     * @return {Promise.<object, Error>} A promise that returns an object if resolved,
     *                                   or an Error if rejected.
     */
    authenticate(code, stateToken) {
        return new Promise((resolve, reject) => {
            if (stateToken !== this._stateToken) {
                throw new Error('The provided stateToken differs from the original one.');
            }
            const data = {
                grant_type: 'authorization_code',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUrl,
                code
            };
            this._code = code;

            this.makeRequest('POST', 'oauth2/token', data, false)
                .then((res) => {
                    if (res.access_token) {
                        this.accessToken = res.access_token;
                    }
                    if (res.refresh_token) {
                        this.refreshToken = res.refresh_token;
                    }
                    resolve(res);
                })
                .catch(reject);
        });
    }

    /**
     * Refreshes the user access token using the refresh one
     * @return {Promise.<object, Error>} A promise that returns an object if resolved,
     *                                   or an Error if rejected.
     */
    refreshAccess() {
        return new Promise((resolve, reject) => {
            const data = {
                grant_type: 'refresh_token',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken
            };

            this.makeRequest('POST', 'oauth2/token', data, false)
                .then((res) => {
                    if (res.access_token) {
                        this.accessToken = res.access_token;
                    }
                    if (res.refresh_token) {
                        this.refreshToken = res.refresh_token;
                    }
                    resolve(res);
                })
                .catch(reject);
        });
    }

    /**
     * Pings the API to check whether everything is correct
     * @return {Promise.<object, Error>} A promise that returns an object if resolved,
     *                                   or an Error if rejected.
     */
    ping() {
        return this.makeRequest('GET', 'ping/whoami');
    }

    /**
     * Returns the accounts for the authenticated user
     * @return {Promise.<object, Error>} A promise that returns an object if resolved,
     *                                   or an Error if rejected.
     */
    accounts(opts = {}) {
        return this.makeRequest('GET', 'accounts', opts);
    }

    /**
     * Makes any request to the Monzo API
     * @param {string} requestType - Can be 'GET' or 'POST'
     * @param {string} requestEndpoint - The path of the API url. e.g. 'ping/whoami'
     * @param {object} requestData - Any data that needs to be sent to the server
     * @param {boolean} [useBearer=true] - Whether to insert the accessToken into the request header or not
     * @return {Promise.<object, Error>} A promise that returns an object if resolved,
     *                                   or an Error if rejected.
     */
    makeRequest(requestType, requestEndpoint, requestData, useBearer = true) {
        return new Promise((resolve, reject) => {
            let req;
            const url = `${API_URL}${requestEndpoint}`;
            if (requestType === 'GET') {
                req = request.get(url);
                req.set('Content-type', 'application/json');
            }
            if (requestType === 'POST') {
                req = request.post(url);
                req.set('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
            }
            if (useBearer) {
                req.set('Authorization', `Bearer ${this.accessToken}`);
            }
            if (requestData) {
                req.send(requestData);
            }
            req.end((err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.body);
                }
            });
        });
    }
}

export default MonzoApi;
