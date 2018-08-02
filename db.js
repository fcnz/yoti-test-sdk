/*
This module is in the place of a database. Data will persist as long as
the node process is alive. Restarting the process will drop everything
and create new fixtures.

This is done to avoid any outside dependencies.
*/

const faker = require('faker')

function fakePost() {
  return {
    email: faker.internet.email(),
    phone: faker.phone.phoneNumber(),
    comment: faker.lorem.words(Math.random() * 10 + 5),
    anonymous: Math.random() < 0.3,
  }
}

const posts = [
  fakePost(),
  fakePost(),
  fakePost(),
  fakePost(),
  fakePost(),
  fakePost(),
  fakePost(),
]

const users = {}

module.exports = {
  posts,
  users,

  // Export a reset method for testing purposes
  __reset() {
    posts = [
      fakePost(),
      fakePost(),
      fakePost(),
      fakePost(),
      fakePost(),
      fakePost(),
      fakePost(),
    ]
    users = {}
  },
}
