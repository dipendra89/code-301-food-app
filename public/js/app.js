'use strict';

$('.recipeInfo').on('click' , recipeInformation);
$('.hideInfoButton').on('click' , hideRecipeInformation)

function recipeInformation (event) {
  event.preventDefault();
  let API = '8402ed04afmsh1e160bbbe297485p1e66e3jsn207dc4e5b10a';
  // let requestedRecipe = $(':nth-child(4)', this).val();
  let requestedRecipe = $(this).prev().val();
  let url = `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${requestedRecipe}/information`;
  let ajaxSettings = {
    async: true,
    crossDomain: true,
    method: 'get',
    dataType: 'json',
    headers: {
      'x-rapidapi-host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com',
      'x-rapidapi-key': API,
    }
  };
  $.ajax(url, ajaxSettings)
  .then( recipe => {
    renderRecipeInfo(recipe, $(this).parent());
    $(this).closest('.recipeForm').find('.recipeInfo').hide();
  });
}

function renderRecipeInfo(data, container) {
  let template = $('#recipeInfo-template').html();
  let ingredientList = data.extendedIngredients.map( item => item.original);
  let view = {
    price: `$${(data.pricePerServing/100).toFixed(2)}`,
    instructions: data.instructions,
    ingredients: ingredientList,
    servings: data.servings,
  }
  container.append( Mustache.render(template, view) );
  container.parent().find('.hideInfoButton').show();
}


function hideRecipeInformation(e) {
  e.preventDefault();
  $(this).parent().prev().find('ul').remove();
  $(this).hide();
  $(this).parent().prev().find('button').show();
}

$('.hideInfoButton').hide();