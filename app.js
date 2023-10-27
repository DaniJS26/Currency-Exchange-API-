import express from "express";
const app = express();

import bodyParser from "body-parser";
app.use(bodyParser.urlencoded({ extended: true }));

import https from "https";
import fs from "fs";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { error } from "console";
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname + "/views/"));

let countriesData, countriesName, latestDate;

async function fetchingData() {
    const url = "https://v6.exchangerate-api.com/v6/cf1451f38314bee4775916da/latest/USD";

    try {
        const jsonData = await new Promise((resolve, reject) => {
            let data = "";

            const req = https.request(url, (response) => {
                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    resolve(data);
                });
            });

            req.on("error", (error) => {
                reject(error);
            });

            req.end();
        });

        fs.writeFile("currencyData.json", jsonData, (err) => {
            if (err) {
                console.log("File saving Error !!");
            }
        });

        return JSON.parse(jsonData);
    } catch (error) {
        console.error(error);
        throw error;
    }
}


app.get("/", async (req, res) => {
    try {
        if (!countriesData) {
            countriesData = await fetchingData();
        }
        countriesName = countriesData["conversion_rates"];

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error: Unable to fetch currency data.");
    }
    res.render(__dirname + "/views/ejs/index.ejs", {
        country: countriesName
    })
})


async function filteringCurrency(fromCurrency, toCurrency) {
    const conversionURL = `https://v6.exchangerate-api.com/v6/cf1451f38314bee4775916da/pair/${fromCurrency}/${toCurrency}`;

    try {
        const resultJSON = await new Promise((resolve, reject) => {
            let data = "";

            const req = https.request(conversionURL, (response) => {
                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    resolve(data);
                });
            });

            req.on("error", (error) => {
                reject(error);
            });

            req.end();
        });

        const resultData = JSON.parse(resultJSON);
        const baseRate = resultData["conversion_rate"];
        const latestDate = resultData["time_last_update_utc"];
        return { baseRate: baseRate, latestDate: latestDate };
    } catch (error) {
        console.error(error);
        throw error;
    }
}


app.post("/convert", async (req, res) => {
    try {
        const fromCurrency = req.body.fromCurrency;
        const toCurrency = req.body.toCurrency;
        const userInput = req.body.userInput;


        if (isNaN(userInput)) {
            res.status(400).send("Error: Ivalid Input");
            return;
        }

        const requireData = await filteringCurrency(fromCurrency, toCurrency);
        const time = (requireData.latestDate).slice(0, 25)
        const calResult = (userInput * parseFloat(requireData.baseRate)).toFixed(2);
        const value2 = (requireData.baseRate).toFixed(2);
        res.render(__dirname + "/views/ejs/result.ejs", {
            amount: calResult,
            date: time,
            value2: value2,
            country1: fromCurrency,
            country2: toCurrency
        })

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error.");
    }
})

app.listen(4000, () => {
    console.log("Server is listening on port 4000...")
})
