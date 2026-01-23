/**
 * geminiService.ts
 * Service to handle chat interactions for the Gemini Demo component.
 * Mocks responses for the landing page demonstration.
 */

interface HistoryItem {
    role: 'user' | 'model';
    content: string;
}

export const chatWithTutor = async (
    message: string,
    history: HistoryItem[]
): Promise<string> => {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('p vs np')) {
        return "The P vs NP problem asks whether every problem whose solution can be quickly verified (NP) can also be quickly solved (P). \n\n### Core Concept\n- **P (Polynomial Time):** Problems solvable reasonably fast (e.g., sorting a list).\n- **NP (Nondeterministic Polynomial Time):** Problems where checking a solution is fast, but finding it might be impossible in reasonable time (e.g., Sudoku, Traveling Salesman).\n\nIf P = NP, it would mean we could solve cancer, break all cryptography, and perfect logistics instantly. Most researchers believe **P ≠ NP**.";
    }

    if (lowerMsg.includes('paper') || lowerMsg.includes('outline')) {
        return "Here is a structural outline for your ML paper:\n\n1. **Abstract**: Briefly state the problem (e.g., 'Transformer efficiency') and your proposed solution (e.g., 'Sparse Attention Mechanism').\n2. **Introduction**: Contextualize the problem. Why do current models fail? What is your contribution?\n3. **Methodology**: \n   - Architecture Diagram\n   - Mathematical Formulation of the Attention Head\n   - Training Setup (Hyperparameters)\n4. **Experiments**: Compare against benchmarks (BERT, GPT-2). Use clear tables.\n5. **Conclusion**: Summarize impact and future work.";
    }

    if (lowerMsg.includes('python') || lowerMsg.includes('code')) {
        return "I can analyze that. Please paste your snippet. Generally, for Python optimization:\n- Use **vectorization** (NumPy/Pandas) instead of loops.\n- Use **generators** for large datasets to save memory.\n- Profile with `cProfile` to find bottlenecks.";
    }

    if (lowerMsg.includes('hubble') || lowerMsg.includes('data')) {
        return "Analyzing Hubble data requires handling FITS files. \n\n**Key Steps:**\n1. **Data Reduction**: Remove cosmic rays and background noise.\n2. **Photometry**: Measure flux of stars/galaxies using `sep` or `photutils`.\n3. **Spectroscopy**: If available, analyze redshift (z) to determine distance.\n\n*Would you like a Python script to load a FITS file?*";
    }

    return "That's a fascinating topic. As a research tutor, I can help you explore it deeper. Could you provide more specific details or data you'd like me to analyze?";
};
