const express = require("express");
const RateLimiter = require("../dist/index.js");
const requestIP =  require("request-ip");

const app = express();
    app.get("/", RateLimiter(3, {}), (req, res) => {
        res.sendStatus(200);
    })

app.listen(9000);