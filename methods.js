// Simple in-memory methods map for recipe instructions
const METHODS = {
  'cheesecake-brownies': {
    prep: '20 min',
    cook: '30-35 min',
    instructions: [
      'Preheat oven to 350°F and line an 8×8 metal pan with parchment paper. Set aside.',
      'In a medium sized bowl, prepare the flax egg by mixing together 3 tablespoons flaxseed meal and 6 tablespoons water. Set aside for 10 minutes to thicken.',
      'Once the flax egg has thickened, add the almond/peanut butter, cane sugar, almond milk and vanilla extract to the bowl. Mix together until uniform, and then add in the gluten free flour, cocoa powder, baking powder and salt. Mix together just until uniform, do not over mix. It if it a bit lumpy, that is ok! It does not need to be smooth.',
      'Transfer about 1/4 of the brownie batter to a small bowl and set aside. Add the remaining brownie batter to the lined pan and spread it out evenly. Set aside.',
      'In another medium to large mixing bowl, prepare the cheesecake layer. First add in the cream cheese alternative and sugar. With a hand mixer (or a whisk), whip them together until smooth. Add in the remaining cheesecake ingredients and whip everything together until smooth. Evenly pour the cream cheese mixture over the brownie batter in the pan. Use a spatula to carefully spread the layer smooth. It there are some “bare” spots, that is alright! Just try your best.',
      'Take your reserved 1/4 brownie batter (stir it if it has become stiff stir) and drop it/drizzle it over the cheesecake layer. You can refer to the photo in the post to see how we did this, but there is no right or wrong way! Using a knife or a toothpick, swirl the brownie batter into the cheesecake batter as desired.',
      'Place the pan into the oven and bake for 35-40 minutes, or until the center is set. Remove from the oven and allow it to cool completely before cutting and serving.',
      'Bake for 30–35 minutes until the cheesecake layer is set but the center still slightly jiggles.',
    ],
    notes: 'For clean slices, wet knife between cuts. We can make the cream cheese!',
    images:[
        'https://sweetsimplevegan.com/wp-content/uploads/2020/01/Vegan-Cheesecake-Brownies-Sweet-Simple-Vegan-2-scaled.jpg',
        'https://sweetsimplevegan.com/wp-content/uploads/2020/01/Vegan-Cheesecake-Brownies-Sweet-Simple-Vegan-12-scaled.jpg'
    ]
  },
  'bbq-black-bean-burgers-with-grilled-onions-potato-wedges': {
    prep: '20 min',
    cook: '25–30 min',
    instructions: [
      'Heat the oil in the skillet. Add the onion and half a teaspoon of sea salt. Cook until the onions are slightly softened, about 10 minutes, stirring often to avoid burning.',
      'Add the garlic and stir into the onions, then add the spices and herbs: 2 tsp ground cumin, 1 tsp ground coriander, 1 tsp paprika, 1½ tsp dried oregano, and 1 tsp dried coriander (cilantro).',
      'Stir the spices well into the onion and cook for 1–2 minutes until the spices release their aromas, being careful not to burn them.',
      'Add the drained jackfruit and the chipotle paste, stirring well to coat. Use a wooden spoon to break up the chunks of jackfruit.',
      'Season with the remaining sea salt and black pepper.',
      'Add the peppers to the pan along with the lime juice and maple syrup. Stir well and cook until the peppers are slightly softened. (For softer peppers, add them earlier with the garlic.)',
      'Finally, stir in the coriander and serve. Be careful—the skillet will be very hot if you bring it to the table.',
      'Serve with warm tortillas, fresh coriander, lime wedges, avocado or guacamole, and salsa if desired.'
    ],
    notes: [
      'Jackfruit – Use young jackfruit canned in water, not syrup. Syrup makes it too sweet.',
      'Do not overcook jackfruit – it can become mushy if cooked too long.',
      'Heat – These fajitas are spicy. For a milder version, reduce or omit the chipotle.',
      'Maple Syrup – Balances the flavors. You can swap with brown sugar or omit.',
      'Storage – Best made fresh. Not suitable for freezing. Leftovers keep in the fridge 1–2 days; reheat until piping hot.',
      'Nutrition – Approximate values, based on two fajitas per person, toppings not included.'
    ],
    images: [
        'https://media.hellofresh.com/w_750,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/64107f61c10333201c02a6ba/step-15097743.jpg',
        'https://media.hellofresh.com/w_750,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/64107f61c10333201c02a6ba/step-ce188998.jpg',
        ]
  }
};
