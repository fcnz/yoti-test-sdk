const express = require('express')
const bodyParser = require('body-parser')
const handlebars = require('express-handlebars')
const fs = require('fs')
const https = require('https')
const crypto = require('crypto')
const yoti = require('yoti')
const db = new require('./db')

const credentials = {
  key: fs.readFileSync(`${__dirname}/keys/dev-key.pem`),
  cert: fs.readFileSync(`${__dirname}/keys/dev-crt.pem`),
}

// Initiate Yoti SDK
const yotiPemFile = fs.readFileSync(`${__dirname}/keys/yoti-sdk.pem`)
const yotiSdkId = '489f32ba-3aee-4997-a6ce-893f08b37c5d'
const yotiApplicationId = 'e65fa84f-4885-443d-93ca-3e3eceba101f'
const yotiClient = new yoti.Client(yotiSdkId, yotiPemFile);

// Setup express app
const app = express()

app.use(bodyParser.urlencoded())
app.use(express.static('static'))

app.engine('handlebars', handlebars({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')

/*
The single index route acts like a program in itself where the query. This way
the entire functionality can be achievd with a combination of server side templating
and form actions.
Params are the input arguments.
Available inputs (query params) are:
token: A token from Yoti used to authenticate a user
loginToken: A token issued by this app to identify an authenticated user
newPost: The content of a new post that is to be added to the "database"
anonymous: Determines whether the users info should be stored with the post
*/
app.all('/*', (req, res) => {
  buildRenderContext(req.query, getUserDetailsFromYoti)
  .then(renderContext => res.render('index', renderContext))
  .catch(error =>
    // Promise rejections are often strings but could also be Error objects
    res.render('error', { message: typeof error === 'string' ? error : error.message })
  )
})

// Pull this function out of the express controller so it can be run independently in tests
function buildRenderContext(query, getUserDetails) {
  // Extract arguments from query
  const {
    token: yotiToken,
    loginToken,
    newPost,
    anonymous
  } = query

  // The render context is the data that is available to the templating engine
  const renderContext = { yotiApplicationId }
  // Unless promise is overwritten, allow execution to proceed right away
  let promise = Promise.resolve()

  // The yoti token should be present if the user has just authenticated
  if (yotiToken) {
    // The render will have to wait for the Yoti API
    promise = getUserDetails(yotiToken)
    // Assign the user data to the render context
    .then(userData => {
      // Create a token to refer to this user in the future
      const loginToken = crypto.randomBytes(16).toString('hex')

      // Add the user to the "database" and the current execution context
      db.users[loginToken] = userData

      // Return the user and the token
      Object.assign(renderContext, { user: userData, loginToken })
    })
  } else if (loginToken) {
    // The loginToken is used to determine the logged in user unless the user has already been set from the Yoti APi
    user = db.users[loginToken]
    renderContext.user = db.users[loginToken]
    renderContext.loginToken = loginToken
  }

  // Only accept new posts if the user is logged in or the anonymous option is selected
  if (newPost && (renderContext.user || anonymous)) {
    db.posts.unshift({
      anonymous,
      comment: newPost,
      email: anonymous ? null : renderContext.user.email,
      phone: anonymous ? null : renderContext.user.phone,
      imageSrc: anonymous ? null : renderContext.user.imageSrc,
    })
  }

  return promise.then(() => Object.assign(renderContext, { posts: db.posts }));
}

// Isolate the code that interacts with the Yoti service
function getUserDetailsFromYoti(token) {
  return yotiClient.getActivityDetails(token)
  .then(activityDetails => {
    if (activityDetails.getOutcome() === 'SUCCESS') {
      // Retrieve the required user info
      const profile = activityDetails.getUserProfile()
      return {
        imageSrc: activityDetails.getBase64SelfieUri(),
        email: profile.emailAddress,
        phone: profile.phoneNumber,
      }
    } else {
      throw new Error('Failed to authenticate')
    }
  })
}

const server = https.createServer(credentials, app)
server.listen(7362)
console.log('listening at https://localhost:7362')

// Export testable method(s)
module.exports = {
  buildRenderContext
}
