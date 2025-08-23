# LPG Gas Company Landing Page

A modern, responsive landing page for LPG Gas Company built with Next.js, Tailwind CSS, and Framer Motion.

## 🚀 Features

### Core Pages
- **Home Page** (`/`) - Hero section, features, services overview, testimonials, CTA
- **About Us** (`/about`) - Company history, mission, vision, values, team, achievements
- **Services** (`/services`) - Detailed service descriptions with features and pricing
- **Shop** (`/shop`) - Product catalog with cart functionality and bulk order options
- **Blog** (`/blog`) - Blog listing with featured posts and newsletter signup
- **Contact** (`/contact`) - Contact form, company info, map, emergency contacts

### Global Components
- **Navbar** - Responsive navigation with dropdown menu and cart indicator
- **Footer** - Company info, quick links, contact details, social media
- **WhatsApp Button** - Floating contact button for instant messaging

### Technical Features
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Animations** - Smooth animations using Framer Motion
- **SEO Optimized** - Meta tags, Open Graph, Twitter Cards
- **Cart System** - Context-based shopping cart with local state
- **Form Handling** - Contact form with validation and submission states

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Components**: Custom UI components with shadcn/ui styling
- **State Management**: React Context API for cart functionality

## 📁 Project Structure

```
src/
├── app/
│   ├── (landing)/           # Landing page routes
│   │   ├── layout.tsx       # Landing page layout (Navbar + Footer)
│   │   ├── page.tsx         # Home page
│   │   ├── about/
│   │   │   └── page.tsx     # About Us page
│   │   ├── services/
│   │   │   └── page.tsx     # Services page
│   │   ├── shop/
│   │   │   └── page.tsx     # Shop page with cart
│   │   ├── blog/
│   │   │   └── page.tsx     # Blog page
│   │   └── contact/
│   │       └── page.tsx     # Contact page
│   ├── (dashboard)/         # Admin dashboard (existing)
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Root page (redirects based on auth)
├── components/
│   ├── layouts/
│   │   ├── Navbar.tsx       # Navigation component
│   │   └── Footer.tsx       # Footer component
│   └── ui/                  # Existing UI components
└── ...
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563eb) - Trust, reliability
- **Secondary**: Yellow (#eab308) - Energy, warmth
- **Accent**: Green (#22c55e) - Success, safety
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Headings**: Bold, large text for impact
- **Body**: Readable, medium weight for content
- **Fonts**: Geist Sans (Google Fonts)

### Components
- **Cards**: Rounded corners, subtle shadows, hover effects
- **Buttons**: Primary (filled), Secondary (outlined), CTA (highlighted)
- **Forms**: Clean inputs with focus states and validation
- **Navigation**: Sticky header with smooth transitions

## 📱 Responsive Breakpoints

- **Mobile**: < 768px (sm)
- **Tablet**: 768px - 1024px (md)
- **Desktop**: > 1024px (lg)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production
```bash
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_WHATSAPP_NUMBER=971501234567
```

### Customization
- **Company Info**: Update contact details in components
- **Images**: Replace placeholder images with your own
- **Content**: Modify text content in each page component
- **Colors**: Update Tailwind CSS color variables
- **SEO**: Modify metadata in layout.tsx

## 📊 SEO Features

- **Meta Tags**: Title, description, keywords
- **Open Graph**: Social media sharing
- **Twitter Cards**: Twitter-specific meta tags
- **Structured Data**: Schema markup for better search results
- **Sitemap**: Auto-generated sitemap.xml
- **Robots.txt**: Search engine crawling instructions

## 🛒 Shopping Cart

### Features
- Add/remove products
- Quantity management
- Cart persistence (local storage)
- Responsive cart drawer
- Total calculation

### Implementation
- React Context for state management
- Local storage for persistence
- Animated cart drawer
- Mobile-optimized interface

## 📧 Contact Form

### Features
- Form validation
- Submission states
- Success/error handling
- Multiple subject options
- Responsive design

### Fields
- Name (required)
- Email (required)
- Phone (optional)
- Subject (required)
- Message (required)

## 🗺️ Google Maps Integration

- Embedded map in contact page
- Responsive iframe
- Custom styling
- Accessibility features

## 📱 WhatsApp Integration

- Floating action button
- Pre-filled message template
- Mobile-optimized
- Accessibility support

## 🎭 Animations

### Framer Motion Features
- **Page Transitions**: Smooth page loading
- **Scroll Animations**: Elements animate on scroll
- **Hover Effects**: Interactive element animations
- **Loading States**: Smooth loading transitions

### Animation Types
- **Fade In**: Opacity and position changes
- **Slide In**: Directional entrance animations
- **Scale**: Hover and focus effects
- **Stagger**: Sequential element animations

## 🔒 Security Features

- **Form Validation**: Client-side input validation
- **XSS Protection**: Safe HTML rendering
- **CSRF Protection**: Form submission security
- **Input Sanitization**: Clean user inputs

## 📈 Performance

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Images and components
- **Bundle Analysis**: Webpack bundle analyzer

## 🧪 Testing

### Manual Testing Checklist
- [ ] Responsive design on all devices
- [ ] Navigation functionality
- [ ] Form submission
- [ ] Cart operations
- [ ] Animation performance
- [ ] SEO meta tags
- [ ] Accessibility features

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Other Platforms
- **Netlify**: Static site generation
- **AWS Amplify**: Full-stack deployment
- **Docker**: Containerized deployment

## 📝 Content Management

### Static Content
- Company information
- Service descriptions
- Team member details
- Blog posts (can be moved to CMS)

### Dynamic Content
- Contact form submissions
- Shopping cart
- Newsletter signups

## 🔄 Future Enhancements

- **CMS Integration**: Content management system
- **E-commerce**: Full shopping cart and checkout
- **Blog System**: Dynamic blog with admin panel
- **Multi-language**: Internationalization support
- **Analytics**: User behavior tracking
- **Chat Support**: Live chat integration

## 🐛 Troubleshooting

### Common Issues
1. **Build Errors**: Check Node.js version compatibility
2. **Styling Issues**: Verify Tailwind CSS configuration
3. **Animation Problems**: Check Framer Motion imports
4. **Responsive Issues**: Test on actual devices

### Debug Mode
```bash
npm run dev -- --debug
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Email: support@lpgcompany.com
- Phone: +971 50 123 4567
- WhatsApp: +971 50 123 4567

---

**Built with ❤️ for LPG Gas Company** 