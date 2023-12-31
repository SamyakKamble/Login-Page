require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
  }));



app.use(passport.initialize());
app.use(passport.session());  

mongoose.connect(process.env.BASE_URL,{useNewUrlParser:true});
mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema( {
    email:String,
    password:String,
    googleId:String,
    facebookId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
 
/////////////     GOOGLE LOGIN      ////////////////

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALL_BACK,
    userProfileURL: process.env.USER_URL
  },
  function(accessToken, refreshToken, profile, cb) {

    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


/////////////      FACEBOOK LOGIN     /////////////

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.USER_FB,
    enableProof: true
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/",(req,res)=>{
    res.render('home');
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }
));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets
    res.redirect("/secrets");
});


app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }); 


app.get("/login",(req,res)=>{
    res.render('login');
});

app.get("/register",(req,res)=>{
    res.render('register');
});

app.get("/secrets",(req,res)=>{
    User.find({"secret":{$ne:null}},(err,foundUser)=>{
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render("secrets",{usersWithSecret:foundUser});
            }
        }
    });
});

app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",(req,res)=>{
    const submittedSecret = req.body.secret ;

    console.log(req.body.id)
    User.findById(req.user.id,(err,foundUser)=>{
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
})


app.get("/logout",(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});



app.post("/register", (req, res)=>{
   
    User.register({username:req.body.username},req.body.password,(err,user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("secrets");
            })
        }
    })
});

app.post("/login",(req,res)=>{

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user,(err)=>{
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
            res.redirect("secrets");
            })};
    })
});


app.listen(3000,(req,res)=>{

    console.log("Server on 3000");
});