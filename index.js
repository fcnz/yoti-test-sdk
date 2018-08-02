const express = require('express')
const db = new require('./db')
const bodyParser = require('body-parser')
const handlebars = require('express-handlebars')
const fs = require('fs')
const https = require('https')
const crypto = require('crypto')
const yoti = require('yoti')

const credentials = {
  key: fs.readFileSync(`${__dirname}/keys/dev-key.pem`),
  cert: fs.readFileSync(`${__dirname}/keys/dev-crt.pem`),
}

const yotiClient = new yoti.Client('23456678', credentials.cert);

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
app.get('/', (req, res) => {
  const renderContext = {}
  let promise = Promise.resolve()

  // The yoti token should be present if the user has just authenticated
  const yotiToken = req.query.token
  if (yotiToken) {
    promise = yotiClient.getActivityDetails(yotiToken)
    .then(activityDetails => {
      if (activityDetails.getOutcome() === 'SUCCESS') {
        const profile = activityDetails.getProfile()
        const newLoginToken = crypto.randomBytes(16).toString('hex')

        db.users[newLoginToken] = profile

        renderContext.user = userData
        renderContext.loginToken = loginToken
      } else {
        throw new Error('Failed to authenticate')
      }
    })
  }

  // The loginToken is used to determine the logged in user
  const loginToken = req.query.loginToken
  let user
  if (loginToken) {
    user = db.users[loginToken]
    renderContext.user = db.users[loginToken]
    renderContext.loginToken = loginToken
  }

  // Only accept new posts if the user is logged in or the anonymous option is selected
  const newPost = req.query.newPost
  const anonymous = Boolean(req.query.anonymous)
  if (newPost && (user || anonymous)) {
    db.posts.unshift({
      comment: newPost,
      anonymous,
      email: anonymous ? null : user.email,
      phone: anonymous ? null : user.phone,
    })
  }

  promise
  .then(() =>
    res.render('index', Object.assign(renderContext, { posts: db.posts }))
  )
  .catch(error =>
    // Promise rejections are often strings but could also be Error objects
    res.render('error', { message: typeof error === 'string' ? error : error.message })
  )
})

const server = https.createServer(credentials, app)
server.listen(7362)
console.log('listening at https://localhost:7362')
