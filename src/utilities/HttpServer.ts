import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as http from 'http';

export default class HttpServer
{
    private _server: http.Server = null;
    private _app = null;

    constructor()
    {
        this._app = express();
        this._server = http.createServer(this._app);

        this._app.use(cors({
            origin: [
                // production
                'https://www.tradingsystemstest.com',
                'https://tradingsystemstest.com',

                // local docker
                'https://www.tradingsystemstest.local',

                // local webpack dev server
                'http://localhost:3000'
            ],
            methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
            allowedHeaders: '*',
            exposedHeaders: ['Content-Type', 'Content-Length', 'Content-Range', 'X-Auth-Token', 'Origin']
        }));

        this._app.use(bodyParser.json());
    }

    getServer()
    {
        return this._server;
    }

    start(port)
    {
        // start http server on a given port
        this._server.listen(port);
    }

    stop()
    {
        this._server.close();
    }
}