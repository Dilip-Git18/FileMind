const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extract text and metadata from PDF file
 * @param {string} filePath 
 * @returns {Promise<{text: string, pages: number}>}
 */
const extractPdfContent = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  return {
    text: data.text || '',
    pages: data.numpages || 1,
    info: data.info || {},
  };
};

/**
 * Split raw text into semantic chunks
 * @param {string} text 
 * @param {number} totalPages 
 * @param {number} chunkSize Default 1000
 * @param {number} overlap Default 200
 * @returns {Array<{text: string, page: number, chunkIndex: number}>}
 */
const createSemanticChunks = (text, totalPages = 1, chunkSize = 1000, overlap = 200) => {
  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  
  if (!cleanedText) return [];

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  const totalLength = cleanedText.length;
  const charsPerPage = Math.max(Math.ceil(totalLength / (totalPages || 1)), 1);

  while (startIndex < totalLength) {
    let endIndex = startIndex + chunkSize;
    
    // Attempt to break at paragraph or sentence end if available near boundary
    if (endIndex < totalLength) {
      const naturalBreak = cleanedText.lastIndexOf('\n', endIndex);
      if (naturalBreak > startIndex + chunkSize * 0.7) {
        endIndex = naturalBreak;
      } else {
        const sentenceBreak = cleanedText.lastIndexOf('. ', endIndex);
        if (sentenceBreak > startIndex + chunkSize * 0.7) {
          endIndex = sentenceBreak + 1;
        }
      }
    } else {
      endIndex = totalLength;
    }

    const chunkText = cleanedText.substring(startIndex, endIndex).trim();
    
    if (chunkText.length > 0) {
      const estimatedPage = Math.min(
        Math.floor(startIndex / charsPerPage) + 1,
        totalPages
      );
      
      chunks.push({
        text: chunkText,
        page: estimatedPage,
        chunkIndex: chunkIndex++,
      });
    }

    if (endIndex >= totalLength) break;
    startIndex = endIndex - overlap;
  }

  return chunks;
};

module.exports = {
  extractPdfContent,
  createSemanticChunks,
};
