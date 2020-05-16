'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL);

// Brings in EJS
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true,}));

// Allows delete and put methods
app.use(methodOverride('_method'));

app.use(express.static('./public'));


//ROUTES ---- PLEASE ADD ALL ROUTES IN THIS SECTION ----
app.get('/', handleHomepage);
app.post('/username', handleLoginPage);
app.delete('/delete/:username', handleDelete);
app.post('/register-user', registerUser);
app.get('/register', loadRegisterPage);
app.get('/recipe-search', recipeSearch);
app.post('/add-recipe', addRecipe);
app.get('/saved-meals', savedMealsHandler);

// recipe API function
function recipeSearch(request, response) {
  const userName = request.query.username;
  const allergy = request.query.allergy;
  const allergyArray = allergy.split(', ');
  const searchWord = request.query.searchWord.toLowerCase(); // we need to coordinate this varible with the frontend team
  const calories = request.query.maxCalories; // coordinate this varible with the frontend team
  if(allergyArray.includes(searchWord)){
    let user = {'username': request.query.username, 'allergies': allergy, 'calories': request.query.calories, };
    response.render('pages/profile', {result:true, profile:user,});
  }
  const url = `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/searchComplex`;
  const queryStringParams = {
    query: searchWord,
    maxCalories: calories,
    excludeIngredients: allergy,
  };
  // console.log(allergy);
  superagent.get(url)
    .query(queryStringParams)
    .set({
      'x-rapidapi-host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com',
      'x-rapidapi-key': process.env.FOOD_API,
      'useQueryString': true
    })
    .then(data => {
      // console.log('results are', data.body);
      let recipes = data.body.results.map(recipe => new Recipe(recipe));
      // console.log(recipes);
      response.status(200).render('pages/search-results', {recipes, allergy:allergy, userName});
    });
}

// recipe constructor
function Recipe(data){
  this.recipeName = data.title;
  this.calories = data.calories;
  this.image = data.image;
  this.recipe_id = data.id;
}

// add recipe function
function addRecipe(request, response) {
  let SQL = `INSERT INTO meal_plan (username, recipe_id, img_url, ingredients, instructions, price)
  VALUES ($1, $2, $3, $4, $5, $6)`;
  let VALUES = [
    request.body.username,
    request.body.recipe_id,
    request.body.img_url,
  ];

  recipeInformation(request.body.recipe_id)
    .then(items => items.forEach( item => {
      VALUES.push(item);
    }))
    .then( () => addToSql(SQL, VALUES) )
    .then( () => response.status(200).redirect('/') ) // make render to profile.ejs
    .catch( error => {
      console.error(error.message);
    });
}

function addToSql (SQL, VALUES) {
  return client.query(SQL,VALUES);
}

function recipeInformation (id) {
  let url = `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${id}/information`;
  return superagent.get(url)
    .set ({
      'x-rapidapi-host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com',
      'x-rapidapi-key': process.env.FOOD_API,
    })
    .then(data => {
      const ingredients = data.body.extendedIngredients.map(item => item.original);
      const recipeInfo = [
        data.body.instructions,
        data.body.pricePerServing
      ];
      recipeInfo.unshift(ingredients);
      // console.log(recipeInfo);
      return recipeInfo;
    });
}

// handler functions

function savedMealsHandler (request, response) {
  let SQL = `SELECT * FROM meal_plan`;
  client.query(SQL)
    .then (results => {
      response.status(200).render('pages/saved-meals', {meal_plan:results.rows,});
    })
    .catch ( error => {
      throw new Error(error);
    });
}

function handleHomepage(request, response ) {
  response.status(200).render('pages/index');
}

function handleLoginPage(request, response ) {
  let SQL = 'SELECT * FROM profiles WHERE username = $1';
  let VALUES = [request.body.username];

  client.query(SQL, VALUES)
    .then( results => {
      if (results.rowCount === 0) {
        response.status(200).render('pages/nouser');
      } else {
        // console.log(results.rows[0]);
        response.status(200).render('pages/profile', {profile:results.rows[0], result:false,});
      }
    })
    .catch(error => {
      throw new Error(error.message);
    });
}

// delete by username not id
function handleDelete( request, response) {
  // response.status(200).redirect('/');
  // console.log(request.params);
  deleteRecipes(request.params.username)
    .then( () => deleteUser(request.params.username))
    .then( response.status(200).redirect('/') );
}

function deleteUser(username) {
  let SQL = 'DELETE FROM profiles WHERE username = $1';
  let VALUES = [username];
  return client.query(SQL, VALUES);
}

function deleteRecipes(username) {
  let SQL = 'DELETE FROM meal_plan WHERE username = $1';
  let VALUES = [username];
  return client.query(SQL, VALUES);
}

// register user
function registerUser(request, response) {
  let SQL = `
    INSERT INTO profiles (username, calories, allergies) 
    VALUES ($1, $2, $3)`;
  let allergies = request.body.allergies;
  // console.log(typeof allergies);

  if(typeof allergies === 'object'){
    allergies = allergies.join(', ');
  }

  let VALUES = [
    request.body.username,
    request.body.calories,
    allergies
  ];
  client.query(SQL, VALUES)
    .then(results => {
      response.status(200).redirect('/');
    });
}

function loadRegisterPage(request,response) {
  response.status(200).render('pages/register');
}

// 404 Error
app.use('*', (request, response) => {
  // console.log(request);
  response.status(404).send(`Can't find ${request.Url.path}`);
});

app.use( (err,req,response,next) => {
  response.status(500).render('pages/500', {err,});
});

//Startup Server
function startServer() {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

//connection the client to the DB
client.connect()
  .then( () => {
    startServer(PORT);
  })
  .catch(err => console.error(err.message));
