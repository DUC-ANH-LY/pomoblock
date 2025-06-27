// blocked.js - External script for blocked page functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get the blocked site from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const blockedSite = urlParams.get('site') || 'this site';
    
    // Update the site name display
    const siteNameElement = document.querySelector('.site-name');
    if (siteNameElement) {
        siteNameElement.textContent = blockedSite;
    }

    // Motivational messages array
    const messages = [
        "You're stronger than your distractions! 💪",
        "Every focused minute is a victory! 🏆",
        "Your goals are calling - don't let them wait! 📞",
        "Productivity mode: ACTIVATED! ⚡",
        "Your future self will thank you for staying focused! 🌟",
        "Great things happen when you stay committed! 🎯",
        "Every distraction avoided is a step towards success! 🚀",
        "Focus is your superpower - use it wisely! ⚡",
        "A focused mind is like a laser beam - powerful! 🔥",
        "You're building amazing focus habits! 🧠",
        "Distractions are temporary, accomplishments are forever! ✨"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const motivationalTextElement = document.querySelector('.motivational-text');
    if (motivationalTextElement) {
        motivationalTextElement.textContent = randomMessage;
    }

    // Load fun content
    loadFunContent();
    
    // Update the page periodically to show it's active
    setInterval(() => {
        const icons = document.querySelectorAll('.icon');
        icons.forEach((icon, index) => {
            setTimeout(() => {
                icon.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    icon.style.transform = 'scale(1)';
                }, 200);
            }, index * 100);
        });
    }, 3000);

    // Add click handler to refresh fun content
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('refresh-content')) {
            loadFunContent();
        }
    });
});

async function loadFunContent() {
    const funContentDiv = document.getElementById('fun-content');
    
    // Add loading state
    funContentDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 10px;">🎲</div>
            <div>Loading something fun...</div>
        </div>
    `;

    try {
        // Try different approaches for fun content
        const randomChoice = Math.floor(Math.random() * 4);
        
        switch(randomChoice) {
            case 0:
                await loadCuteCat(funContentDiv);
                break;
            case 1:
                await loadCuteDog(funContentDiv);
                break;
            case 2:
                await loadRandomMeme(funContentDiv);
                break;
            case 3:
                await loadMotivationalQuote(funContentDiv);
                break;
            default:
                loadFallbackContent(funContentDiv);
        }
    } catch (error) {
        console.log('API failed, using fallback content');
        loadFallbackContent(funContentDiv);
    }
}

async function loadCuteCat(container) {
    try {
        const response = await fetch('https://api.thecatapi.com/v1/images/search');
        const data = await response.json();
        if (data[0]?.url) {
            container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 1.3rem; margin-bottom: 15px;">🐱 Here's a cute cat to cheer you up!</div>
                    <img src="${data[0].url}" style="max-width: 100%; max-height: 250px; border-radius: 12px; object-fit: cover; opacity: 0; transform: scale(0.9); transition: all 0.3s ease;">
                    <div style="margin-top: 15px;">
                        <button class="refresh-content refresh-btn">🔄 Another kitty!</button>
                    </div>
                </div>
            `;
            // Add load event listener to the image after it's added to DOM
            const img = container.querySelector('img');
            img.addEventListener('load', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
            });
        } else {
            throw new Error('No cat data');
        }
    } catch (error) {
        loadFallbackContent(container);
    }
}

async function loadCuteDog(container) {
    try {
        const response = await fetch('https://dog.ceo/api/breeds/image/random');
        const data = await response.json();
        if (data.message) {
            container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 1.3rem; margin-bottom: 15px;">🐶 Here's a good boy/girl!</div>
                    <img src="${data.message}" style="max-width: 100%; max-height: 250px; border-radius: 12px; object-fit: cover; opacity: 0; transform: scale(0.9); transition: all 0.3s ease;">
                    <div style="margin-top: 15px;">
                        <button class="refresh-content refresh-btn">🔄 Another pup!</button>
                    </div>
                </div>
            `;
            // Add load event listener to the image after it's added to DOM
            const img = container.querySelector('img');
            img.addEventListener('load', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
            });
        } else {
            throw new Error('No dog data');
        }
    } catch (error) {
        loadFallbackContent(container);
    }
}

async function loadRandomMeme(container) {
    try {
        const response = await fetch('https://meme-api.com/gimme');
        const data = await response.json();
        if (data.url && !data.nsfw) {
            container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 1.3rem; margin-bottom: 15px;">😂 ${data.title || 'Random Meme'}</div>
                    <img src="${data.url}" style="max-width: 100%; max-height: 300px; border-radius: 12px; object-fit: contain; opacity: 0; transform: scale(0.9); transition: all 0.3s ease;">
                    <div style="margin-top: 15px;">
                        <button class="refresh-content refresh-btn">🔄 Another meme!</button>
                    </div>
                </div>
            `;
            // Add load event listener to the image after it's added to DOM
            const img = container.querySelector('img');
            img.addEventListener('load', function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
            });
        } else {
            throw new Error('No appropriate meme');
        }
    } catch (error) {
        loadFallbackContent(container);
    }
}

async function loadMotivationalQuote(container) {
    const quotes = [
        { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
        { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
        { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
        { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "Your limitation—it's only your imagination.", author: "Unknown" },
        { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
        { text: "Great things never come from comfort zones.", author: "Unknown" }
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 1.3rem; margin-bottom: 15px;">💬 Daily Motivation</div>
            <blockquote style="font-style: italic; font-size: 1rem; line-height: 1.6; margin: 20px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px; border-left: 4px solid #ffeb3b;">
                "${quote.text}"
                <footer style="margin-top: 15px; font-size: 0.8rem; opacity: 0.8;">— ${quote.author}</footer>
            </blockquote>
            <button class="refresh-content refresh-btn">🔄 Another quote!</button>
        </div>
    `;
}

function loadFallbackContent(container) {
    const emojis = ['🌟', '🎯', '💪', '🚀', '⚡', '🎨', '🧠', '✨', '🎭', '🎪', '🎨', '🌈'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const funFacts = [
        "🧠 Your brain uses about 20% of your total energy!",
        "🍅 The Pomodoro Technique was invented in the 1980s by Francesco Cirillo!",
        "⚡ Focused work for 25 minutes can be more productive than 2 hours of distracted work!",
        "🎯 Studies show that it takes an average of 23 minutes to refocus after an interruption!",
        "💡 Taking breaks actually improves your creativity and problem-solving abilities!",
        "🚀 NASA uses focus techniques similar to Pomodoro for space missions!",
        "🌟 Every time you resist a distraction, you're building stronger willpower!"
    ];
    
    const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
    
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 15px;">${randomEmoji}</div>
            <div style="font-size: 1.2rem; margin-bottom: 15px;">Fun Focus Fact!</div>
            <div style="font-size: 0.95rem; line-height: 1.6; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 12px;">
                ${randomFact}
            </div>
            <button class="refresh-content refresh-btn" style="margin-top: 15px;">🔄 Another fact!</button>
        </div>
    `;
} 