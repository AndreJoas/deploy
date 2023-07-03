const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3002;

const uri = 'mongodb+srv://andrejoas:meutcc@cluster0.taa4fgi.mongodb.net/';
const dbName = 'dadosRaio';

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para exibir o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Função para importar um arquivo JSON para uma coleção específica no MongoDB
async function importJSONToCollection(filePath, collectionName) {
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    const db = client.db(dbName);

    const jsonData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonData);
    await db.collection(collectionName).insertMany(data);
    console.log(`Arquivo ${filePath} importado para a coleção ${collectionName}`);

    client.close();
  } catch (err) {
    console.error(`Erro ao importar arquivo ${filePath} para a coleção ${collectionName}:`, err);
  }
}

// Importar arquivos JSON para a coleção "dadosRaio2023"
async function importJSONFilesToMongoDB() {
  const jsonFiles = [
    { filePath: './dadosJaneiro.json', collectionName: 'dadosRaio2023' },
    // { filePath: './dadosFevereiro.json', collectionName: 'dadosRaio2023' },
    // { filePath: './dadosMarco.json', collectionName: 'dadosRaio2023' },
  ];

  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    const db = client.db(dbName);

    const collectionExists = await db.collection('dadosRaio2023').countDocuments() > 0;

    if (!collectionExists) {
      for (const file of jsonFiles) {
        const jsonData = fs.readFileSync(file.filePath, 'utf8');
        const data = JSON.parse(jsonData);
        await db.collection(file.collectionName).insertMany(data);
        console.log(`Arquivo ${file.filePath} importado para a coleção ${file.collectionName}`);
      }
    } else {
      console.log('A coleção "dadosRaio2023" já contém documentos. Nenhum arquivo importado.');
    }

    client.close();
  } catch (err) {
    console.error('Erro ao importar arquivos JSON:', err);
  }
}

// Importar os arquivos JSON para a coleção "dadosRaio2023" antes de iniciar o servidor
importJSONFilesToMongoDB()
  .then(() => {
    // Rota para consultar os dados da coleção "dadosRaio2023"
    app.get('/api', async (req, res) => {
      try {
        const { month, quantity, type, time } = req.query; // Obter os filtros da query string

        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();

        const db = client.db(dbName);

        // Construir o filtro com base nos parâmetros fornecidos
        const filter = {};
        if (month) {
          filter.month = parseInt(month);
        }
        if (quantity) {
          filter.quantity = parseInt(quantity);
        }
        if (type) {
          filter.type = parseInt(type);
        }
        if (time) {
          filter.time_utc = new Date(time);
        }

        const projection = { _id: 0, type: 1, latitude: 1, longitude: 1, time_utc: 1 };

        const collectionDocuments = await db.collection('dadosRaio2023').find(filter, { projection }).sort({ _id: 1 }).limit(84104).toArray();

        res.json(collectionDocuments);
      } catch (err) {
        console.error('Errom ao conectar ou buscar dados:', err);
        res.status(500).send('Erro ao buscar dados');
      }
    });

    // Iniciar o servidor
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}/index.html`);
    });
  })
  .catch((err) => {
    console.error('Erro ao importar arquivos JSON:', err);
  });
