const express = require("express");
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const headers = req.headers;

  const { authorization } = headers;
  let token;
  let decode;

  if (authorization) {
    token = authorization.split(" ")[1];
  } else {
    return res.status(402).send({
      // token ไม่สมบูรณ์
      error: "token not valid5",
    });
  }

  try {
    decode = jwt.verify(token, process.env.SECRET);
    req.user = decode;
    next();
  } catch (error) {
    return res.status(401).send({
      // ถอด token ไม่ได้
      error: "token not valid4",
    });
  }
}

module.exports = auth;
