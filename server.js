require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const bodyParser = require("body-parser");
const dns = require("dns");
const urlParser = require('url');
const res = require('express/lib/response');

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.urlencoded({ extended: "false" }));

const shortURLSchema = new mongoose.Schema( 
  { 
    url : String,
    short : String
  } 
);

const ShortURL = mongoose.model('ShortURL', shortURLSchema);

const alphabet = "abcdefghijklmnopqrstuvwxyz";

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

async function isUniqueShort(short){
  let matches = await ShortURL.find({ short: short });
  return matches == 0;
}

async function isUniqueLong(long){
  let match = await ShortURL.findOne({ url: long });
  return match;
}

function generateShort(){
  let short = "";
  for(i = 0; i < 5; i++){
    if(Math.floor(Math.random() * 2) == 0){
      short += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    else{
      short += (Math.floor(Math.random() * 10)).toString();
    }
  }
  return short;
}

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post("/api/shorturl", async function(req, res){
  //check if url is valid
  try{
    const longURL = (new URL(req.body.url)).hostname;
    //check if url already exists in db
    //console.log("checking is url is unique...");
    let uniqueLong = await isUniqueLong(req.body.url);
    //console.log(uniqueLong);
    if(uniqueLong){
      res.json({
        "original_url" : uniqueLong.url,
        "short_url" : uniqueLong.short
      });
      return;
    }
    //console.log("url is unique!");

    //console.log("creating short...")
    // create short for url
    let short = await generateShort();
    while(!isUniqueShort(short)){
      short = await generateShort();
    }
    //console.log("short generated: "+ short);
    //create + save object in db
    const shortUrl = new ShortURL(
      { 
        url: req.body.url,
        short: short
      }
    );
    shortUrl.save();
    res.json(
      {
        "original_url" : shortUrl.url,
        "short_url" : shortUrl.short
      }
    );
  }
  catch(err){
    res.json({"error":"invalid url"});
    console.log(err);
  }
});

app.get("/api/shorturl/:id", function(req, res){
  ShortURL.findOne({ short: req.params.id.toLowerCase()}, function(err, data) {
    if(err){
      res.json({"error" : "invalid url"});
    }
    res.redirect(data.url);
  }
)});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
