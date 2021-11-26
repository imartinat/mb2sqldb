# Import ManageBac data in a SQL Database

## Requirements

- node
- npm

## How to use it

- copy env-example .env
- edit .env with your ManageBac auth-token
- In a terminal run the following commands :

```
npm run build
npm run start
```

By default it will use a sqlite database in prisma/db/dev.db
You can setup an other SQL database (https://www.prisma.io/docs/reference/database-reference/supported-databases) in .env and replace the info in prisma/schema.prisma, for example for postresql :

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
