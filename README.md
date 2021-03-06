# Import ManageBac data in a SQL Database

## Requirements

- node
- npm

## How to use it

- run the following commands or download the folder:

```
git clone https://github.com/imartinat/mb2sqldb
cd mb2sqldb
```

- copy env-example to .env
- edit .env with your ManageBac auth-token
- run the following commands :

```
npm run build
npm run start
```

## It will import the following ManageBac endpoints with most of the fields:

- students
- parents
- teachers
- classes
- memberships

By default it will use a sqlite database in prisma/db/dev.db
You can setup an other SQL database (https://www.prisma.io/docs/reference/database-reference/supported-databases) in .env and replace the info in prisma/schema.prisma, for example for postresql :

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Explore and manipulate your data

You can use Prisma studio to access and manipulate the data : https://www.prisma.io/studio or a software like DBeaver to run queries.
