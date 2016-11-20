Package.describe({
  name: 'streemo:matchmaker',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Real-time matchmaking for N-groups of users.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/Streemo/meteor-matchmaker.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1.1');
  api.use(['ecmascript','mongo','ejson','random',"check"], 'server')
  api.addFiles(['filters.js','updates.js','validators.js'],'server')
  api.mainModule('matchmaker.js','server');
});
