import express from "express";
import pg from "pg";
import dayjs from "dayjs";
import formatParser from 'dayjs/plugin/customParseFormat.js'
import { stripHtml } from "string-strip-html";
import Joi from "joi";

const { Pool } = pg;
pg.types.setTypeParser(1082, (str) => str);
dayjs.extend(formatParser)

const connection = new Pool({
  user: "bootcamp_role",
  password: "senha_super_hiper_ultra_secreta_do_role_do_bootcamp",
  host: "localhost",
  port: 5432,
  database: "boardcamp",
});

const app = express();
app.use(express.json());

app.get("/categories", async (req, res) => {
  try {
    const result = await connection.query("SELECT * FROM categories");
    res.send(result.rows);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.post("/categories", async (req, res) => {
  if (!req.body.name) {
    res.sendStatus(400);
    return;
  }
  req.body.name = stripHtml(req.body.name).result.trim();
  const result = await connection.query(
    "SELECT * FROM categories WHERE name = $1",
    [req.body.name]
  );
  const categories = result.rows[0];
  const schemaExistAndNotEmpty = Joi.object({
    name: Joi.string().min(1).required(),
  });
  const errorExistAndNotEmpty = schemaExistAndNotEmpty.validate(req.body);
  const { name } = req.body;
  try {
    if (errorExistAndNotEmpty.error) {
      res.sendStatus(400);
      return;
    } else if (categories) {
      res.sendStatus(409);
      return;
    }
    await connection.query("INSERT INTO categories (name) VALUES ($1)", [name]);
    res.sendStatus(201);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.get("/games", async (req, res) => {
  if (req.query.name) {
    req.query.name = stripHtml(req.query.name).result.trim();
  }
  const { name } = req.query;
  const query = name ? " WHERE games.name ILIKE $1" : "";
  const preparedQuery = name ? [`${name}%`] : "";
  try {
    const result = await connection.query(
      'SELECT games.*, categories.name AS "categoryName" FROM games JOIN categories ON games."categoryId" = categories.id ' +
        query,
      preparedQuery
    );
    res.send(result.rows);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.post("/games", async (req, res) => {
  if (!req.body.name) {
    res.sendStatus(400);
    return;
  }
  req.body.name = stripHtml(req.body.name).result.trim();
  req.body.image = stripHtml(req.body.image).result.trim();
  const resultNames = await connection.query(
    "SELECT * FROM games WHERE name = $1",
    [req.body.name]
  );
  const resultCategories = await connection.query(
    "SELECT * FROM categories WHERE id = $1",
    [req.body.categoryId]
  );
  const games = resultNames.rows[0];
  const categories = resultCategories.rows[0];
  const schema = Joi.object({
    name: Joi.string().min(1).required(),
    stockTotal: Joi.number().min(1).required(),
    pricePerDay: Joi.number().min(1).required(),
    image: Joi.string(),
    categoryId: Joi.number(),
  });
  const { error } = schema.validate(req.body);
  const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
  try {
    if (error || !categories) {
      res.sendStatus(400);
      return;
    } else if (games) {
      res.sendStatus(409);
      return;
    }
    await connection.query(
      'INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)',
      [name, image, stockTotal, categoryId, pricePerDay]
    );
    res.sendStatus(201);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.get("/customers", async (req, res) => {
  if (req.query.cpf) {
    req.query.cpf = stripHtml(req.query.cpf).result.trim();
  }
  const { cpf } = req.query;
  const query = cpf ? " WHERE cpf ILIKE $1" : "";
  const preparedQuery = cpf ? [`${cpf}%`] : "";
  try {
    const result = await connection.query(
      "SELECT * FROM customers" + query,
      preparedQuery
    );
    res.send(result.rows);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.get("/customers/:id", async (req, res) => {
    req.params.id = stripHtml(req.params.id).result.trim();
    const { id } = req.params;
    try {
      const result = await connection.query(
        "SELECT * FROM customers WHERE id = $1", [id]);
        if(!result.rows[0]){
            res.sendStatus(404)
        }
      res.send(result.rows[0]);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });

app.post("/customers", async (req, res) => {
  req.body.name = stripHtml(req.body.name).result.trim();
  req.body.phone = stripHtml(req.body.phone).result.trim();
  req.body.cpf = stripHtml(req.body.cpf).result.trim();
  req.body.birthday = stripHtml(req.body.birthday).result.trim();
  const { name, phone, cpf, birthday } = req.body;
  const scheme = Joi.object({
    name: Joi.string().min(1).required(),
    birthday: Joi.date().required(),
    cpf: Joi.string().pattern(/^[0-9]{11}$/),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/),
  });
  const resultCpf = await connection.query(
    "SELECT * FROM customers WHERE cpf = $1",
    [req.body.cpf]
  );
  const { error } = scheme.validate(req.body);
  try {
    if (error || !dayjs(birthday, 'YYYY-MM-DD', true).isValid()) {
      res.sendStatus(400);
      return;
    }
    if (resultCpf.rows[0]) {
      res.sendStatus(409);
      return;
    }
    await connection.query(
      "INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)",
      [name, phone, cpf, birthday]
    );
    res.sendStatus(201);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.put("/customers/:id", async (req, res) => {
    req.params.id = stripHtml(req.params.id).result.trim();
    req.body.name = stripHtml(req.body.name).result.trim();
    req.body.phone = stripHtml(req.body.phone).result.trim();
    req.body.cpf = stripHtml(req.body.cpf).result.trim();
    req.body.birthday = stripHtml(req.body.birthday).result.trim();
    const { name, phone, cpf, birthday } = req.body;
    const { id } = req.params
    const scheme = Joi.object({
      name: Joi.string().min(1).required(),
      birthday: Joi.date().required(),
      cpf: Joi.string().pattern(/^[0-9]{11}$/),
      phone: Joi.string().pattern(/^[0-9]{10,11}$/),
    });
    const resultCpf = await connection.query(
      "SELECT * FROM customers WHERE cpf = $1",
      [req.body.cpf]
    );
    const { error } = scheme.validate(req.body);
    try {
      if (error || !dayjs(birthday, 'YYYY-MM-DD', true).isValid()) {
        res.sendStatus(400);
        return;
      }
      if (resultCpf.rows[0]) {
        res.sendStatus(409);
        return;
      }
      await connection.query(
        "UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5",
        [name, phone, cpf, birthday, id]
      );
      res.sendStatus(201);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });

  app.post("/rentals", async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    const scheme = Joi.object({
      daysRented: Joi.number().min(1).required(),
      customerId: Joi.number().min(1).required(),
      gameId: Joi.number().min(1).required(),
    });
    const resultCustomerId = await connection.query(
      "SELECT * FROM customers WHERE id = $1",
      [customerId]
    );
    const resultGameId = await connection.query(
      "SELECT * FROM games WHERE id = $1",
      [gameId]
    );
    const { error } = scheme.validate(req.body);
    try {
      if (
        error ||
        !resultCustomerId.rows[0] ||
        !resultGameId.rows[0] ||
        resultGameId.rows[0].stockTotal < 1
      ) {
        res.sendStatus(400);
        return;
      }
      await connection.query(
        'INSERT INTO rentals ("customerId", "gameId", "daysRented", "rentDate", "originalPrice", "returnDate", "delayFee" ) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [customerId, gameId, daysRented, dayjs().format('YYYY-MM-DD'), resultGameId.rows[0].pricePerDay * daysRented, null, null]
      );
      await connection.query(
        'UPDATE games SET "stockTotal" = "stockTotal" - 1 WHERE id = $1',
        [gameId]
      );
      res.sendStatus(201);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });

  app.get("/rentals", async (req, res) => {
    if (req.query.customerId) {
      req.query.customerId = stripHtml(req.query.customerId).result.trim();
    }
    const { customerId, gameId } = req.query;
    const query = customerId ? ' WHERE "customerId" = $1' : (gameId ? ' WHERE "gameId" = $1' : "");
    const preparedQuery = customerId ? [`${customerId}`] : (gameId ? [`${gameId}`] : "");
    try {
      const result = await connection.query(
        "SELECT * FROM rentals" + query,
        preparedQuery
      );
      res.send(result.rows);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });

  app.post("/rentals/:id/return", async (req, res) => {
    if (req.params.id) {
      req.params.id = stripHtml(req.params.id).result.trim();
    }
    const { id } = req.params
    const resultRent = await connection.query(
      "SELECT * FROM rentals WHERE id = $1",
      [id]
    );
    const resultGamePrice = await connection.query(
        'SELECT "pricePerDay" FROM games WHERE id = $1',
        [resultRent.rows[0].gameId]
      );
    try {
      if (!resultRent.rows[0]) {
        res.sendStatus(404);
        return;
      }
      if (resultRent.rows[0].returnDate) {
        res.sendStatus(400);
        return;
      }
      let fee = dayjs('2021-07-22').diff(dayjs(resultRent.rows[0].rentDate).add(resultRent.rows[0].daysRented, 'day'), 'day') * resultGamePrice.rows[0].pricePerDay
      if( fee < 0) fee = 0
      await connection.query(
        'UPDATE rentals SET "returnDate" = $1, "delayFee" = $2 WHERE id = $3',
        [dayjs(), fee, id]
      );
      await connection.query(
        'UPDATE games SET "stockTotal" = "stockTotal" + 1 WHERE id = $1',
        [resultRent.rows[0].gameId]
      );
      res.sendStatus(200);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });

  app.delete("/rentals/:id", async (req, res) => {
    if (req.params.id) {
      req.params.id = stripHtml(req.params.id).result.trim();
    }
    const { id } = req.params
    const resultRent = await connection.query(
      "SELECT * FROM rentals WHERE id = $1",
      [id]
    );
    try {
      if (!resultRent.rows[0]) {
        res.sendStatus(404);
        return;
      }

      await connection.query(
        'DELETE FROM rentals WHERE id = $1',
        [id]
      );
      await connection.query(
        'UPDATE games SET "stockTotal" = "stockTotal" + 1 WHERE id = $1',
        [resultRent.rows[0].gameId]
      );
      res.sendStatus(200);
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });




app.listen(4000, () => console.log("Server is listening"));
