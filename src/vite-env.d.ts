/// <reference types="vite/client" />

// Declare module for markdown files imported with ?raw suffix
declare module '*.md?raw' {
    const content: string;
    export default content;
}

declare module '*.md' {
    const content: string;
    export default content;
}
