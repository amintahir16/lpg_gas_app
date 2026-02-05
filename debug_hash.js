
const CYLINDER_COLORS = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-teal-100 text-teal-800 border-teal-200', // Index 6
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-lime-100 text-lime-800 border-lime-200', // Index 10
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
];

const getCylinderColor = (type) => {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CYLINDER_COLORS.length;
    return { index, color: CYLINDER_COLORS[index] };
};

const candidates = [
    "DOMESTIC_11_8KG",
    "Domestic 11.8kg",
    "Domestic (11.8kg)",
    "DOMESTIC",
    "Standard",
    "Commercial"
];

candidates.forEach(c => {
    console.log(`Type: "${c}" -> Index: ${getCylinderColor(c).index}`);
});
