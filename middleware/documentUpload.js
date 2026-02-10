// middleware/documentUpload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

// Configure Cloudinary storage for guest documents
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'guest-documents',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
    resource_type: 'auto', // This allows both images and raw files (PDFs)
    transformation: [
      {
        width: 1000,
        height: 1000,
        crop: 'limit',
        quality: 'auto',
        format: 'auto'
      }
    ]
  }
});

// Configure multer with file size limits and validation
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'), false);
    }
  }
});

// Middleware for single document upload (passport, medical certificate, travel insurance)
const uploadSingleDocument = (fieldName) => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'File too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          message: err.message
        });
      }
      
      // Add file URL to request object for easy access
      if (req.file) {
        req.fileUrl = req.file.path;
        req.fileId = req.file.filename;
      }
      
      next();
    });
  };
};

// Middleware for multiple document uploads
const uploadMultipleDocuments = (fields) => {
  return (req, res, next) => {
    const multipleUpload = upload.fields(fields);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'File too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          message: err.message
        });
      }
      
      // Process uploaded files and add URLs to request
      if (req.files) {
        req.uploadedFiles = {};
        Object.keys(req.files).forEach(fieldName => {
          if (req.files[fieldName] && req.files[fieldName][0]) {
            req.uploadedFiles[fieldName] = {
              url: req.files[fieldName][0].path,
              fileId: req.files[fieldName][0].filename
            };
          }
        });
      }
      
      next();
    });
  };
};

// Function to delete file from Cloudinary
const deleteCloudinaryFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

module.exports = {
  uploadSingleDocument,
  uploadMultipleDocuments,
  deleteCloudinaryFile
};