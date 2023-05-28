require('dotenv').config();
const { MongoClient } = require('mongodb');

// Specify and Import the Model file name, then get the collection name
const modelFileName = 'url';
const Model = require(`../models/${modelFileName}`);
const collectionName = Model.collection.name;

// Specify the DB URI, then get the DB name
const dbUri = require('..index');
const dbName = dbUri.split('/').pop().split('?')[0];

// Log specified collection from specified DB
(async () => {
    const client = new MongoClient(dbUri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        try {
            const documents = await collection.find().toArray();
            for (const doc of documents) {
                console.log(doc); 
            }
        } catch (error) {
            console.error(`Error fetching collection ${collectionName} - ERROR: ${error}`);
        }
    } catch (error) {
        console.error(console.error(`Error connecting to DB ${dbName} - ERROR: ${error}`));
    } finally {
        await client.close();
    } 
})();
