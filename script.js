class RSVPReader {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.intervalId = null;
        this.speed = 300; // words per minute
        
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        this.textInput = document.getElementById('textInput');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.spacingSlider = document.getElementById('spacingSlider');
        this.spacingValue = document.getElementById('spacingValue');
        this.colorPicker = document.getElementById('colorPicker');
        this.colorValue = document.getElementById('colorValue');
        this.displaySection = document.getElementById('displaySection');
        this.wordDisplay = document.getElementById('wordDisplay');
        this.cellGrid = document.getElementById('cellGrid');
        this.progressText = document.getElementById('progressText');
        this.fileInput = document.getElementById('fileInput');
        this.fileName = document.getElementById('fileName');
        
        // Initialize spacing CSS variable to match slider value
        const initialSpacing = parseInt(this.spacingSlider.value);
        document.documentElement.style.setProperty('--letter-gap', `${initialSpacing}px`);
        
        // Initialize color CSS variable to match color picker value (with fallback)
        const initialColor = this.colorPicker ? this.colorPicker.value : '#e74c3c';
        document.documentElement.style.setProperty('--center-letter-color', initialColor);
        if (this.colorValue) {
            this.colorValue.textContent = initialColor;
        }
        
        // Set up PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }
    
    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            this.speedValue.textContent = this.speed;
            if (this.isPlaying && !this.isPaused) {
                this.restart();
            }
        });
        this.spacingSlider.addEventListener('input', (e) => {
            const spacingValue = parseInt(e.target.value);
            this.spacingValue.textContent = spacingValue;
            document.documentElement.style.setProperty('--letter-gap', `${spacingValue}px`);
        });
        if (this.colorPicker) {
            this.colorPicker.addEventListener('input', (e) => {
                const colorValue = e.target.value;
                if (this.colorValue) {
                    this.colorValue.textContent = colorValue;
                }
                document.documentElement.style.setProperty('--center-letter-color', colorValue);
            });
        }
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.fileName.textContent = `Loading: ${file.name}...`;
        this.fileName.style.color = '#667eea';
        
        try {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (fileExtension === 'txt') {
                await this.readTextFile(file);
            } else if (fileExtension === 'pdf') {
                await this.readPDFFile(file);
            } else {
                throw new Error('Unsupported file type. Please upload a .txt or .pdf file.');
            }
            
            this.fileName.textContent = `Loaded: ${file.name}`;
            this.fileName.style.color = '#27ae60';
        } catch (error) {
            console.error('Error reading file:', error);
            this.fileName.textContent = `Error: ${error.message}`;
            this.fileName.style.color = '#e74c3c';
            alert(`Error reading file: ${error.message}`);
        }
    }
    
    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.textInput.value = e.target.result;
                resolve();
            };
            reader.onerror = () => reject(new Error('Failed to read text file'));
            reader.readAsText(file);
        });
    }
    
    async readPDFFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            const numPages = pdf.numPages;
            
            // Extract text from all pages
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                fullText += pageText + ' ';
            }
            
            this.textInput.value = fullText.trim();
        } catch (error) {
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
    }
    
    parseText(text) {
        // Split text into words, preserving punctuation
        return text.trim().split(/\s+/).filter(word => word.length > 0);
    }
    
    getHighlightIndex(word) {
        // Find the optimal recognition point (middle of the word)
        if (word.length === 0) return 0;
        
        // Skip punctuation at the start
        let startIdx = 0;
        while (startIdx < word.length && /[^\w]/.test(word[startIdx])) {
            startIdx++;
        }
        
        // Skip punctuation at the end
        let endIdx = word.length - 1;
        while (endIdx >= 0 && /[^\w]/.test(word[endIdx])) {
            endIdx--;
        }
        
        if (startIdx > endIdx) return Math.floor(word.length / 2); // Only punctuation, use middle
        
        const wordLength = endIdx - startIdx + 1;
        // Choose the middle letter of the actual word (not including punctuation)
        return startIdx + Math.floor(wordLength / 2);
    }
    
    displayWord() {
        if (this.currentIndex >= this.words.length) {
            this.stop();
            return;
        }
        
        const word = this.words[this.currentIndex];
        if (word.length === 0) {
            this.currentIndex++;
            return;
        }
        
        // Get the index of the letter to highlight (middle of word)
        const highlightIndex = this.getHighlightIndex(word);
        
        // Clear previous word
        this.cellGrid.innerHTML = '';
        
        // Split word into characters
        const chars = word.split('');
        
        // Create three containers: before, center (red), after
        const lettersBefore = document.createElement('div');
        lettersBefore.className = 'letters-before';
        
        const centerLetter = document.createElement('span');
        centerLetter.className = 'center-letter';
        centerLetter.textContent = chars[highlightIndex];
        
        const lettersAfter = document.createElement('div');
        lettersAfter.className = 'letters-after';
        
        // Add letters before the red letter
        for (let i = 0; i < highlightIndex; i++) {
            const cell = document.createElement('span');
            cell.className = 'cell';
            cell.textContent = chars[i];
            lettersBefore.appendChild(cell);
        }
        
        // Add letters after the red letter
        for (let i = highlightIndex + 1; i < chars.length; i++) {
            const cell = document.createElement('span');
            cell.className = 'cell';
            cell.textContent = chars[i];
            lettersAfter.appendChild(cell);
        }
        
        // Append all three parts
        this.cellGrid.appendChild(lettersBefore);
        this.cellGrid.appendChild(centerLetter);
        this.cellGrid.appendChild(lettersAfter);
        
        // Measure center letter width and set CSS variable for positioning
        requestAnimationFrame(() => {
            const halfWidth = centerLetter.offsetWidth / 2;
            this.cellGrid.style.setProperty('--center-letter-half-width', `${halfWidth}px`);
        });
        
        this.progressText.textContent = `Word ${this.currentIndex + 1} of ${this.words.length}`;
        
        this.currentIndex++;
    }
    
    start() {
        const text = this.textInput.value.trim();
        if (!text) {
            alert('Please enter some text to read!');
            return;
        }
        
        this.words = this.parseText(text);
        if (this.words.length === 0) {
            alert('No valid words found in the text!');
            return;
        }
        
        // If paused, resume from current position
        if (this.isPaused) {
            this.isPaused = false;
            this.isPlaying = true;
            this.startBtn.style.display = 'none';
            this.pauseBtn.style.display = 'inline-block';
            this.stopBtn.style.display = 'inline-block';
            this.displaySection.style.display = 'flex';
            this.restart();
            return;
        }
        
        // Start fresh
        this.currentIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;
        
        this.startBtn.style.display = 'none';
        this.pauseBtn.style.display = 'inline-block';
        this.stopBtn.style.display = 'inline-block';
        this.displaySection.style.display = 'flex';
        this.textInput.disabled = true;
        
        this.displayWord();
        this.scheduleNext();
    }
    
    scheduleNext() {
        // Convert WPM to milliseconds per word
        const msPerWord = (60 / this.speed) * 1000;
        
        this.intervalId = setInterval(() => {
            if (this.currentIndex >= this.words.length) {
                this.stop();
            } else {
                this.displayWord();
            }
        }, msPerWord);
    }
    
    pause() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isPaused = true;
        this.isPlaying = false;
        this.startBtn.style.display = 'inline-block';
        this.startBtn.textContent = 'Resume';
        this.pauseBtn.style.display = 'none';
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isPlaying = false;
        this.isPaused = false;
        this.currentIndex = 0;
        
        this.startBtn.style.display = 'inline-block';
        this.startBtn.textContent = 'Start Reading';
        this.pauseBtn.style.display = 'none';
        this.stopBtn.style.display = 'none';
        this.displaySection.style.display = 'none';
        this.textInput.disabled = false;
        
        // Clear all cells
        this.cellGrid.innerHTML = '';
        
        this.progressText.textContent = 'Word 0 of 0';
    }
    
    restart() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.scheduleNext();
    }
}

// Initialize the RSVP reader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RSVPReader();
});

