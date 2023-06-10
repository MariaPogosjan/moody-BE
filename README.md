# Moody: project idea 😀😐😥

Moody is an app where users can track their feelings over time (daily, weekly, monthly, yearly) and share it with friends. The user can track his/her mood to be able to analyse what hard or happy times he/she had and perhaps relate it to the activities in their life. Users of this application are able to:
- Be able to login/signup with with Google.
- Register mood from suggested options.
-	Get inspirational quotes once the feeling registration is submitted.
-	Check in the calendar and the graph what mood he/she had over time.
-	Post their thoughts and feelings to get support from other users through 💖hearts💖 and 💬comments💬.
-	Follow 👯friends👯 feelings and thoughts.


## Tech stack

  Frontend: React, Redux, Styled Components, Material UI, Plotly, React Calendar APIs, Google Authentication \

  Backend: Node.js, Express, Mongoose, MongoDB, REST API\

## Endpoint

### Enpoints related to creating, updating and getting user information
-	POST '/googlelogin'
-	POST '/users'
-	POST '/sessions'
-	PATCH '/users/:id/email'
-	PATCH '/users/:id/username'
-	PATCH '/users/:id/password'
-	DELETE '/users/:id'
-	POST '/users/:id/avatar'
-	GET '/users'
-	GET '/users/:id'

### Enpoints related to registering and getting information about feelings

-	GET '/feelings/:id'
-	GET '/friendfeeling/:id'
-	POST '/feelings'

### Enpoints related to sendng, accepting and denying friend requests

-	PUT '/follow'
-	PUT '/acceptfriends'
-	PUT '/denyfriends'
-	PATCH '/unfollow'

### Enpoints related to creating, commenting, liking and getting thoughts
-	GET '/thoughts'
-	POST '/thoughts'
-	PATCH '/thoughts/:thoughtId/comment'
-	PATCH '/thoughts/:thoughtId/hug'

## View live

Netlify:https://polite-griffin-ef5047.netlify.app/ \

Heroku: https://moody-be-77tqxxowdq-lz.a.run.app \
