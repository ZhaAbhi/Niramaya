import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

export const fileUpload = (req: Request, res: Response): void => {
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
  const uploadFolder = path.join(__dirname, 'uploads');

  try {
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
  } catch (err) {
    console.error('Error creating upload directory:', err);
    res.status(500).json({ error: 'Failed to create upload directory' });
    return;
  }

  let hasError = false;
  const filePromises: Promise<void>[] = [];
  const uploadedFiles: string[] = [];

  busboy.on(
    'file',
    (
      fieldname: string,
      file: Readable,
      info: { filename: string; encoding: string; mimeType: string }
    ) => {
      const { filename, mimeType } = info;
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

      if (!filename) {
        console.log(`Skipping empty filename for field: ${fieldname}`);
        file.resume();
        return;
      }

      const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
      const fileExt = path.extname(sanitizedFilename).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        console.log(`Invalid file extension for ${sanitizedFilename}`);
        file.resume();
        hasError = true;
        return;
      }

      if (!allowedMimeTypes.includes(mimeType)) {
        console.log(`Invalid file type: ${mimeType} for ${sanitizedFilename}`);
        file.resume();
        hasError = true;
        return;
      }

      const uniqueFilename = `${path.basename(sanitizedFilename, fileExt)}-${uuidv4()}${fileExt}`;
      const saveTo = path.join(uploadFolder, uniqueFilename);
      const writeStream = fs.createWriteStream(saveTo);

      uploadedFiles.push(saveTo);

      const filePromise = new Promise<void>((resolve, reject) => {
        file.pipe(writeStream);

        writeStream.on('finish', () => {
          console.log(`Upload complete: ${uniqueFilename}`);
          resolve();
        });

        writeStream.on('error', (err) => {
          console.error(`Error writing file ${uniqueFilename}:`, err);
          hasError = true;
          try {
            if (fs.existsSync(saveTo)) {
              fs.unlinkSync(saveTo);
              console.log(`Cleaned up partial file: ${uniqueFilename}`);
            }
          } catch (cleanupErr) {
            console.error(`Error cleaning up file ${uniqueFilename}:`, cleanupErr);
          }
          reject(err);
        });

        file.on('error', (err) => {
          console.error(`Error reading file ${uniqueFilename}:`, err);
          hasError = true;
          try {
            if (fs.existsSync(saveTo)) {
              fs.unlinkSync(saveTo);
              console.log(`Cleaned up partial file: ${uniqueFilename}`);
            }
          } catch (cleanupErr) {
            console.error(`Error cleaning up file ${uniqueFilename}:`, cleanupErr);
          }
          reject(err);
        });
      });

      filePromises.push(filePromise);
    }
  );

  busboy.on('filesLimit', () => {
    console.error('File size limit reached');
    hasError = true;
    if (!res.headersSent) {
      uploadedFiles.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up partial file: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error cleaning up file ${filePath}:`, err);
        }
      });
      res.status(413).json({ error: 'File size limit exceeded' });
    }
  });

  busboy.on('error', (err) => {
    console.error('Busboy error:', err);
    if (!res.headersSent) {
      uploadedFiles.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up partial file: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error cleaning up file ${filePath}:`, err);
        }
      });
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  busboy.on('finish', () => {
    Promise.allSettled(filePromises)
      .then((results) => {
        if (res.headersSent) return;
        const errors = results.filter(
          (result) => result.status === 'rejected'
        );
        if (errors.length > 0 || hasError) {
          uploadedFiles.forEach((filePath) => {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up partial file: ${filePath}`);
              }
            } catch (err) {
              console.error(`Error cleaning up file ${filePath}:`, err);
            }
          });
          res.status(500).json({ error: 'Some files failed to upload' });
        } else {
          res.status(200).json({ message: 'All files uploaded successfully' });
        }
      })
      .catch((err) => {
        if (!res.headersSent) {
          uploadedFiles.forEach((filePath) => {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up partial file: ${filePath}`);
              }
            } catch (err) {
              console.error(`Error cleaning up file ${filePath}:`, err);
            }
          });
          console.error('Unexpected error in Promise.allSettled:', err);
          res.status(500).json({ error: 'Unexpected error during upload' });
        }
      });
  });

  req.pipe(busboy);
};