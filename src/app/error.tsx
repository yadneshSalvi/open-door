"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="error-page"><h1>Let’s open that door again.</h1><p>The studio hit an unexpected error. Reload the provided room to continue.</p><button className="primary-button" onClick={reset}>Try again</button></main>;}
