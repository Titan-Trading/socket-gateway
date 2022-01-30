import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as http from 'http';

export default class HttpServer
{
    io = null;
    http = null;
    app = null;
    _onRequest = null;

    constructor()
    {
        this.app = express();
        this.http = http.createServer(this.app);

        this.app.use(cors());
        this.app.use(bodyParser.json());
    }

    getServer()
    {
        return this.http;
    }

    start(port)
    {
        // start http server on a given port
        this.http.listen(port);

        this.app.get('/', (req, res) => {
            console.log('home route');
            return res.status(200).send('OK');
        });

        // setup global request listener
        this.app.use((req, res) => {
            if(typeof this._onRequest == 'function') {
                this._onRequest(req, res);
            }
        });
    }

    stop()
    {
        this.http.close();
    }

    onRequest(callback)
    {
        this._onRequest = callback;
    }
}