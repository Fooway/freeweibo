//
// configuration
//

module.exports = {
  key_user: 'freeman2013_28472', // initial user
  // timing config for sub tasks and API requests
  TM: {
    DELETE_INTERVAL: 8 * 24 * 60 * 60 * 1000, 
    DELETE_TASK: 8 * 60 * 60 * 1000,
    CHECK_SELECT_TWEETS: 5 * 24 * 60 * 60 * 1000,
    FETCH_INTERVAL: 3 * 60 * 1000, 
    CHECK_INTERVAL: 66 * 60 * 1000,
    API_REQUEST_INTERVAL: 6 * 1000
  },

  APP_IDS: [
    '3364683177',
    '3123403167',
    '2421323772',
    '138507463',
    '79071089',
    '1628998857',
    '92384490',
    '3694877555',
    '953840599',
    '2876251236'
  ]
}
