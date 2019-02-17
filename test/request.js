const request = require('request');

const serverHost = 'https://masoiapp.herokuapp.com'; // https://masoiapp.herokuapp.com  // http://localhost:3001

async function postRequest(url, body) {
    return new Promise((resolve, reject) => {
        request.post({ url: `${serverHost + url}`, form: body }, (err, res, body) => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({ success: 'false', err: "post_request_failed" });
            }
        });
    })
}

async function sendRequest(url) {
    return new Promise((resolve, reject) => {
        request.get(`${serverHost + url}`, (err, res, body) => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({ success: 'false', err: "get_request_failed" });
            }
        });
    })
}

module.exports = {
    postRequest: postRequest,
    sendRequest: sendRequest
}