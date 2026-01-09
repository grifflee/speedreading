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
        this.displaySection = document.getElementById('displaySection');
        this.wordDisplay = document.getElementById('wordDisplay');
        this.progressText = document.getElementById('progressText');
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
    }
    
    parseText(text) {
        // Split text into words, preserving punctuation
        return text.trim().split(/\s+/).filter(word => word.length > 0);
    }
    
    highlightLetter(word) {
        // Find the optimal recognition point (typically around the middle)
        // For RSVP, we'll highlight a letter near the center
        if (word.length === 0) return word;
        
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
        
        if (startIdx > endIdx) return word; // Only punctuation
        
        const wordLength = endIdx - startIdx + 1;
        // Choose a letter around 1/3 from the start (optimal recognition point)
        const highlightIndex = startIdx + Math.floor(wordLength / 3);
        
        const before = word.substring(0, highlightIndex);
        const letter = word[highlightIndex];
        const after = word.substring(highlightIndex + 1);
        
        return `${before}<span class="red-letter">${letter}</span>${after}`;
    }
    
    displayWord() {
        if (this.currentIndex >= this.words.length) {
            this.stop();
            return;
        }
        
        const word = this.words[this.currentIndex];
        this.wordDisplay.innerHTML = this.highlightLetter(word);
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
        this.wordDisplay.innerHTML = '';
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

