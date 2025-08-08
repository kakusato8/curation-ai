import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

// Sample markdown content for testing
const sampleMarkdown = `# Markdown Rendering Test

This is a **comprehensive test** of our markdown rendering system.

## Features Included

### 1. Headers
All heading levels from H1 to H6 are supported with proper styling.

### 2. Text Formatting
- **Bold text** using double asterisks
- *Italic text* using single asterisks
- \`inline code\` with syntax highlighting
- ~~Strikethrough text~~

### 3. Lists

#### Unordered Lists:
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

#### Ordered Lists:
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### 4. Links and Images
- [External link to Google](https://www.google.com) (opens in new tab)
- [Internal documentation](#section)

### 5. Code Blocks

#### JavaScript Example:
\`\`\`javascript
function greetUser(name) {
  const message = \`Hello, \${name}! Welcome to our system.\`;
  console.log(message);
  return message;
}

// Usage
const greeting = greetUser("Claude");
\`\`\`

#### Python Example:
\`\`\`python
def calculate_total(items):
    """Calculate the total of all items in the list."""
    total = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total

# Example usage
shopping_cart = [
    {'name': 'Apple', 'price': 100, 'quantity': 5},
    {'name': 'Banana', 'price': 80, 'quantity': 3}
]
total_cost = calculate_total(shopping_cart)
print(f"Total cost: {total_cost} yen")
\`\`\`

### 6. Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Headers | ✅ | All levels supported |
| Links | ✅ | Opens in new tabs |
| Code | ✅ | Syntax highlighting |
| Tables | ✅ | Responsive design |
| Lists | ✅ | Nested support |

### 7. Blockquotes

> This is an important quote or note that stands out from the regular content.
> It supports multiple lines and maintains proper formatting.
>
> - You can even include lists
> - And other formatting inside blockquotes

### 8. Horizontal Rules

---

### 9. GitHub Flavored Markdown

- [x] Task lists are supported
- [x] Strikethrough text works
- [ ] Unchecked task item
- [ ] Another unchecked item

### 10. Security Features

All links automatically open in new tabs with proper security attributes (\`noopener noreferrer\`).

---

## Search Highlighting

When using the search functionality, matching terms will be highlighted with a yellow background for easy identification.

## Responsive Design

The markdown content is fully responsive and will adapt to different screen sizes while maintaining readability.`;

export const MarkdownTest: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#2c3e50' }}>
        Markdown Rendering Test Page
      </h1>
      
      <div style={{ 
        border: '1px solid #e1e4e8', 
        borderRadius: '8px', 
        padding: '1.5rem',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <MarkdownRenderer 
          content={sampleMarkdown} 
          className="test-content"
        />
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
        <h3>Search Highlighting Test</h3>
        <p>Below is the same content with search highlighting for the term "markdown":</p>
        <div style={{ 
          border: '1px solid #e1e4e8', 
          borderRadius: '8px', 
          padding: '1rem',
          backgroundColor: '#fff',
          marginTop: '1rem'
        }}>
          <MarkdownRenderer 
            content={sampleMarkdown.substring(0, 500) + "..."} 
            searchTerm="markdown"
            className="test-content-highlighted"
          />
        </div>
      </div>
    </div>
  );
};

export default MarkdownTest;