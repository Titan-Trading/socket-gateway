const express = require('express');

export default class HttpServer
{
    app = null;
    _onRequestCallbacks = {};

    constructor()
    {
        this.app = express();
    }

    start(port)
    {
        // start http server on a given port
        this.app.listen(port);

        // setup global request listener
        this.app.use((req, res) => {
            const requestHash = req.method + '-' + req.url;

            if(typeof this._onRequestCallbacks[requestHash] !== 'function') {
                return res.status(404).send('Not found');
            }

            this._onRequestCallbacks[requestHash](req, res);
        });
    }

    stop()
    {

    }

    on(method, endpoint, callback)
    {
        if(typeof this._onRequestCallbacks[method + '-' + endpoint] === 'function') {
            return false;
        }

        this._onRequestCallbacks[method + '-' + endpoint] = callback;

        return true;
    }
}