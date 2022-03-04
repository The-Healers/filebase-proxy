require('dotenv').config()
const fs = require('fs');
const AWS = require('aws-sdk');

const express = require('express');

const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');


const app = express();

// enable files upload
app.use(fileUpload({
  createParentPath: true
}));

//add other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));


app.get('/', async (req, res) => {
  const { key } = req.query;

  AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    signatureVersion: 'v4',
  });

  const s3 = new AWS.S3({
      endpoint: process.env.ENDPOINT,
  });

  const getParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: key
  }
  
  s3.getObject(getParams, (err, data) => {
    if (err) {
      res.send({
        status: false,
        message: 'No file found'
      });
      return;
    }

    res.send({
      status: true,
      message: 'Found file',
      data: data
    })

  });

})

app.post('/upload', async (req, res) => {
  try {
      if(!req.files) {
          res.send({
              status: false,
              message: 'No file uploaded'
          });
      } else {
          //Use the name of the input field (i.e. "docFile") to retrieve the uploaded file
          let docFile = req.files.docFile;
          
          //Use the mv() method to place the file in upload directory (i.e. "uploads")
          docFile.mv('./uploads/' + docFile.name, (err) => {
            if(err) {
              console.log(err)
              //send response
              res.send({
                status: false,
                message: 'Failed moving file',
                data: {
                  error: err
                }
              });
            } else {

              AWS.config.update({
                accessKeyId: process.env.ACCESS_KEY,
                secretAccessKey: process.env.SECRET_KEY,
                signatureVersion: 'v4',
              });
            
              const s3 = new AWS.S3({
                  endpoint: process.env.ENDPOINT,
              });
            
              // Read content from the file
              const fileContent = fs.readFileSync('./uploads/' + docFile.name);
            
              s3.listBuckets(function(err, data) {
                console.log("working")
                if (err) {
                  console.log(err, err.stack);

                  //send response
                  res.send({
                    status: false,
                    message: 'No Bucket',
                    data: {
                      error: err
                    }
                  });
                } else {
                  // Setting up S3 upload parameters
                  var params = {
                    Body: fileContent,
                    Bucket: process.env.BUCKET_NAME,
                    Key: docFile.name,
                  };
                  s3.putObject(params, function(err, data) {
                    if (err) {
                      console.log(err, err.stack);
                      //send response
                      res.send({
                        status: false,
                        message: 'Failed uploading file',
                        data: {
                          error: err
                        }
                      });
                    } else {
                      console.log(data);

                      //send response
                      res.send({
                        status: true,
                        message: 'File is uploaded',
                        data: {
                            name: docFile.name,
                            mimetype: docFile.mimetype,
                            size: docFile.size
                        }
                      });

                      // Delete example_file.txt
                      fs.unlink(`${'./uploads/' + docFile.name}`, (err => {
                        if (err) { console.log("FAILED DELETING FILE", err) }
                        else {
                          console.log("Deleted file:", docFile.name);
                        }
                      }));
                    }
                  });
                }
              });
            }
          })
      }
  } catch (err) {
      res.status(500).send(err);
  }
});

//make uploads directory static
app.use(express.static('uploads'));

//start app 
const port = process.env.PORT || 3000;

app.listen(port, () => 
  console.log(`App is listening on port ${port}.`)
);

// Export the Express API
module.exports = app