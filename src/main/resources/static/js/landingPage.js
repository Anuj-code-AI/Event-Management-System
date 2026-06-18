document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Navigation Header
    const header = document.querySelector('header');
    const checkScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', checkScroll);
    checkScroll();

    // 2. Mobile Responsive Nav Menu Toggle
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('mobile-open');

            const iconPath = mobileToggle.querySelector('path');
            if (navMenu.classList.contains('mobile-open')) {
                iconPath.setAttribute('d', 'M6 18L18 6M6 6l12 12'); // Change to 'X'
            } else {
                iconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16'); // Back to hamburger
            }
        });

        // Close mobile nav when clicking a menu link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('mobile-open');
                const iconPath = mobileToggle.querySelector('path');
                if (iconPath) {
                    iconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                }
            });
        });
    }

    // 3. Multi-Hero Slide Switcher (Perspectives Selector)
    const controlButtons = document.querySelectorAll('.carousel-control-btn');
    const carouselSlides = document.querySelectorAll('.carousel-slide');

    controlButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSlideIndex = button.getAttribute('data-slide');

            // Update control button active styles
            controlButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Transition slides
            carouselSlides.forEach(slide => {
                slide.classList.remove('active');
                if (slide.getAttribute('data-slide') === targetSlideIndex) {
                    slide.classList.add('active');
                }
            });
        });
    });

    // 4. Auto-Rotation for Hero (Optional - pauses on mouse hover)
    let slideInterval;
    let currentSlide = 0;

    const startSlideRotation = () => {
        slideInterval = setInterval(() => {
            currentSlide = (currentSlide + 1) % carouselSlides.length;
            controlButtons[currentSlide].click();
        }, 8000); // Rotate every 8 seconds
    };

    const stopSlideRotation = () => {
        clearInterval(slideInterval);
    };

    startSlideRotation();

    const heroSection = document.querySelector('.hero-carousel');
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopSlideRotation);
        heroSection.addEventListener('mouseleave', startSlideRotation);
    }

    // 5. Collapsible FAQ Accordion Toggle
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close other open questions
            faqItems.forEach(i => i.classList.remove('active'));

            // Toggle current question
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // 6. Scroll Animations Observer
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    scrollElements.forEach(element => {
        scrollObserver.observe(element);
    });
});
