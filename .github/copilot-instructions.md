## Basic Principles

- Always choose understandable words in Japanese and strive for polite expressions.
- Use English for code docstrings.
- Explain in a way that is easy for beginners to understand. Avoid technical jargon as much as possible, and add simple explanations when necessary.
- If you do not understand the intent of a question, communicate that.
- Avoid code duplication and prioritize iteration and modularization.
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`).
- Use the RORO pattern (Receive an Object, Return an Object) as needed.
- When making suggestions, break changes into individual steps and propose small tests at each stage to check progress.
- Review existing code deeply and describe its behavior before writing any code.
- Consider hosting, managing, monitoring, and maintaining the solution, emphasizing operational concerns.
- Adjust the approach based on feedback, ensuring the proposal evolves to meet project needs.
- Verify at every stage to avoid compromising data or introducing new vulnerabilities.
- Conduct additional reviews if there are potential security risks.
- When presenting code examples, explain the purpose of each line with detailed comments and show the execution results.
- Provide advice on good coding habits and best practices as opportunities arise.
- Explain error messages, interpret their meanings, and provide step-by-step debugging procedures.
- Break down complex problems into small steps and explain each one carefully.

## Code Style and Structure

<!-- - Write concise and technical TypeScript code using precise examples. -->
- no ver style uses let and const, and no var.
- Organize files by exported components, sub-components, helpers, static content, and types.
- Use lowercase with dashes for directory names (e.g., `components/auth-wizard`).
- Use named exports for components. Use kebab-case for component names (e.g., `my-component.tsx`).
- Use the `function` keyword for pure functions.
- Use concise syntax for simple statements.
- Write declarative JSX.
- Avoid unnecessary curly braces in conditional statements and omit them for single-line statements.
- Omit semicolons unless necessary to avoid ambiguity.
- Add clear and concise comments for complex logic.
- Use JSDoc comments for functions and components to enhance IDE IntelliSense.
- Keep the README file always up-to-date.

## Behavior

- Act as an expert in TypeScript, Node.js, Next.js (App Router), React, Material UI, Tailwind CSS, Zust and, TanStack Query, Supabase, Zod, Stripe, nuqs, and i18next.

## UI and Styling

- Use, Material UI, Tailwind CSS for components and styling.
- Implement responsive design with Tailwind CSS, adopting a mobile-first approach.
- Use semantic HTML elements, implement appropriate ARIA attributes, and support keyboard navigation.

## State Management and Data Fetching

- Use Zustand for global state management.
- Use TanStack Query for data fetching, caching, and synchronization.
- Minimize the use of `use client`, `useEffect`, and `useState`, prioritizing RSC and Next.js SSR features when possible.
- Use `nuqs` for managing URL search parameter state.

## Database

- Use Drizzle ORM to define database schemas and write type-safe queries.
- Use the Supabase client to interact with the database.
- Properly set Row Level Security (RLS) policies to control data access.
- Use Supabase Auth, Storage, and Edge Functions as needed.

## Forms and Validation

- Use controlled components for form inputs.
- Implement form validation on both the client side and server side.
- Consider using `react-hook-form` for complex forms.
- Use Zod for schema validation.
- Use `next-safe-action` for all server actions, implementing type-safe server actions with appropriate validation.

## Error Handling and Security

- Prioritize error handling and edge cases.
- Use early returns and guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Model expected errors as return values for server actions.
- Use error boundaries for unexpected errors.
- Sanitize user input to prevent XSS attacks.
- Use `dangerouslySetInnerHTML` sparingly and only with sanitized content.

## Optimization and Performance

- Optimize for Web Vitals (LCP, CLS, FID).
- Use dynamic loading for non-critical components.
- Use appropriate formats for images, include size data, and implement lazy loading.
- Implement route-based code splitting with Next.js.
- Minimize the use of global styles, preferring modular and scoped styles.

## Other Technologies

- Implement Stripe for payment processing and subscription management.
- Use i18next and related libraries for internationalization.

## Testing

- Write unit tests for components using Jest and React Testing Library.
- Implement integration tests for critical user flows.

## Key Conventions

- Depend on the Next.js App Router for state changes.
- Minimize the use of `use client`.
- Prioritize server components and Next.js SSR features, using client-side Web API access only for small components and not for data fetching or state management.
