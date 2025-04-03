require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");
const serverless = require("serverless-http");
const app = express();
app.use(cors());
app.use(express.json());

const PAT = process.env.CLARIFAI_API_KEY;
if (!PAT) {
  throw new Error("CLARIFAI_API_KEY env key is unset!");
}
const USER_ID = "clarifai";
const APP_ID = "main";
const MODEL_ID = "general-image-recognition";
const MODEL_VERSION_ID = "aa7f35c01e0642fda5cf400f543e7c40";
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set("authorization", "Key " + PAT);

const router = express.Router();

let records = [];

router.get("/", (req, res) => {
  res.send("Server is running..");
});

// Create new record
router.post("/add", (req, res) => {
  res.send("New record added.");
});

// delete existing record
router.delete("/", (req, res) => {
  res.send("Deleted existing record");
});

// updating existing record
router.put("/", (req, res) => {
  res.send("Updating existing record");
});

// showing demo records
router.get("/demo", (req, res) => {
  res.json([
    {
      id: "001",
      name: "Smith",
      email: "smith@gmail.com",
    },
    {
      id: "002",
      name: "Sam",
      email: "sam@gmail.com",
    },
    {
      id: "003",
      name: "lily",
      email: "lily@gmail.com",
    },
  ]);
});

// Endpoint to process image using Clarifai model
router.post("/predict", async (req, res) => {
  const { image_url } = req.body;

  try {
    const response = await new Promise((resolve, reject) => {
      stub.PostModelOutputs(
        {
          user_app_id: { user_id: USER_ID, app_id: APP_ID },
          model_id: MODEL_ID,
          version_id: MODEL_VERSION_ID,
          inputs: [
            {
              data: {
                image: { url: image_url },
              },
            },
          ],
        },
        metadata,
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    if (response.status.code !== 10000) {
      return res
        .status(500)
        .json({ message: `API call failed: ${response.status.description}` });
    }

    const concepts = response.outputs[0].data.concepts.map((concept) => ({
      name: concept.name,
      value: concept.value,
    }));

    res.json({ predictions: concepts });
  } catch (error) {
    res.status(500).json({ message: "Error processing image", error });
  }
});

// Endpoint to fetch news using News API
router.get("/news", async (req, res) => {
  const query = req.query.query || "chatgpt";
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 1); // set the date to yesterday
  // const dateFrom = new Date().toISOString().split("T")[0] || "2025-04-03";
  const formattedDate = dateFrom.toISOString().split("T")[0];

  console.log(formattedDate);

  if (!NEWS_API_KEY) {
    return res.status(500).json({ message: "News API key is missing." });
  }

  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${query}&apiKey=${NEWS_API_KEY}&from=${formattedDate}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response.status).json(error.response.data);
  }
});

app.use("/.netlify/functions/api", router);
module.exports.handler = serverless(app);
