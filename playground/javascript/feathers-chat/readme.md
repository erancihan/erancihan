# feathers-chat

> test feathersjs

## About

This project uses [Feathers](http://feathersjs.com). An open source framework for building APIs and real-time applications.

## Getting Started

1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
2. Install your dependencies

    ```
    cd path/to/feathers-chat
    npm install
    ```

3. Start your app

    ```
    npm run compile # Compile TypeScript source
    npm run migrate # Run migrations to set up the database
    npm start
    ```

## Testing

Run `npm test` and all your tests in the `test/` directory will be run.

## Scaffolding

This app comes with a powerful command line interface for Feathers. Here are a few things it can do:

```
$ npx feathers help                           # Show all commands
$ npx feathers generate service               # Generate a new Service
```

## Help

For more information on all the things you can do with Feathers visit [docs.feathersjs.com](http://docs.feathersjs.com).

## Remarks
There were some issues with the original code that have been fixed in this version:
- Updated `package.json` to include overrides for the `config` package to ensure compatibility.
    - Version existing in feathers is not running properly, and was raising errors.
- Replaced `sqlite3` with `better-sqlite3` for improved performance and reliability.
- PNPM was not building `better-sqlite3` binaries by default, had to ensure that it is built during installation.
- Followed the online FeathersJS documentation to set up:
    - Messages service
    - Users service with authentication