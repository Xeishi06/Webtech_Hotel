<?php
/**
 * Room photos.
 *
 * These live in this file rather than in the database, so swapping a picture
 * is a one-line edit. The key is the room's category slug from the rooms
 * table (couples, family-4, family-6, family-12, family-15).
 *
 * Swap any URL for your own image, e.g. 'images/fam4-standard.jpg'.
 * Keep the quotes and commas exactly as they are.
 */

return [

    'couples' => [
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
    ],

    'family-4' => [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=600&q=80',
    ],

    'family-6' => [
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1598928506319-c55ded91a20c?auto=format&fit=crop&w=600&q=80',
    ],

    'family-12' => [
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=600&q=80',
    ],

    'family-15' => [
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=600&q=80',
    ],

];