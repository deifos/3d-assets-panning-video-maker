"use client";


export function Footer() {
  return (
    <footer className="w-full border-t border-gray-700 py-4 bg-gray-900">
      <div className="w-full flex justify-center items-center text-sm text-gray-400">
        Built by Vlad - Find me on X{" "}
        <a
          href="https://x.com/deifosv"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-medium text-blue-400 hover:underline"
        >
          @deifosv
        </a>
      </div>
    </footer>
  );
}
