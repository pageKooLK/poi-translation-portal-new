import { NextRequest, NextResponse } from 'next/server';

// Mock SERP API response based on real SERP API format
export async function GET(request: NextRequest) {
  const searchQuery = "Zoo Aquarium de Madrid";
  
  // This simulates what a real SERP API would return
  const serpApiResponse = {
    "search_metadata": {
      "id": "65d4f8b9c9f1e2a3b4d5e6f7",
      "status": "Success",
      "json_endpoint": "https://serpapi.com/searches/65d4f8b9c9f1e2a3b4d5e6f7.json",
      "created_at": "2025-09-08 06:00:00 UTC",
      "processed_at": "2025-09-08 06:00:01 UTC",
      "google_url": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&hl=en&gl=us",
      "raw_html_file": "https://serpapi.com/searches/65d4f8b9c9f1e2a3b4d5e6f7.html",
      "total_time_taken": 1.23
    },
    "search_parameters": {
      "engine": "google",
      "q": searchQuery,
      "location_requested": "Madrid, Spain",
      "location_used": "Madrid,Community of Madrid,Spain",
      "google_domain": "google.com",
      "hl": "en",
      "gl": "us",
      "device": "desktop"
    },
    "search_information": {
      "organic_results_state": "Results for exact spelling",
      "query_displayed": searchQuery,
      "total_results": 567000,
      "time_taken_displayed": 0.31,
      "menu_items": [
        {
          "position": 1,
          "title": "All",
          "link": null,
          "serpapi_link": null
        },
        {
          "position": 2,
          "title": "Images",
          "link": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&tbm=isch",
          "serpapi_link": "https://serpapi.com/search.json?q=Zoo+Aquarium+de+Madrid&tbm=isch"
        },
        {
          "position": 3,
          "title": "Videos",
          "link": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&tbm=vid",
          "serpapi_link": "https://serpapi.com/search.json?q=Zoo+Aquarium+de+Madrid&tbm=vid"
        }
      ]
    },
    "local_map": {
      "link": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&tbm=lcl",
      "image": "https://www.google.com/maps/vt/data=...",
      "gps_coordinates": {
        "latitude": 40.4093,
        "longitude": -3.7621,
        "altitude": 13
      }
    },
    "knowledge_graph": {
      "title": "Zoo Aquarium de Madrid",
      "type": "Zoo",
      "subtitle": "Zoo and aquarium in Madrid, Spain",
      "description": "Zoo Aquarium de Madrid is a 20-hectare zoo and aquarium located in the Casa de Campo in Madrid, Spain. The zoo is property of the city council, but it is managed by the international entertainment operator Parques Reunidos.",
      "source": {
        "name": "Wikipedia",
        "link": "https://en.wikipedia.org/wiki/Madrid_Zoo_Aquarium"
      },
      "image": "https://lh5.googleusercontent.com/p/AF1QipN...",
      "website": "https://www.zooaquariummadrid.com/",
      "address": "Casa de Campo, s/n, 28011 Madrid, Spain",
      "phone": "+34 902 34 50 14",
      "hours": "Open ⋅ Closes 8 PM",
      "place_id": "ChIJiUWqjPYqQg0R1TK9a5FQ9G4",
      "rating": 4.2,
      "review_count": 15234,
      "reviews_link": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&stick=...",
      "reviews": [
        {
          "date": "2 weeks ago",
          "rating": 5,
          "source": "Maria G.",
          "snippet": "Great experience! The dolphin show was amazing and the pandas were adorable."
        },
        {
          "date": "1 month ago", 
          "rating": 4,
          "source": "John D.",
          "snippet": "Nice zoo with a good variety of animals. A bit pricey but worth it for families."
        }
      ],
      "people_also_search_for": [
        {
          "name": "Parque Warner Madrid",
          "link": "https://www.google.com/search?q=Parque+Warner+Madrid",
          "image": "https://encrypted-tbn0.gstatic.com/images?q=..."
        },
        {
          "name": "Faunia",
          "link": "https://www.google.com/search?q=Faunia+Madrid",
          "image": "https://encrypted-tbn0.gstatic.com/images?q=..."
        }
      ],
      "see_results_about": [
        {
          "name": "Zoo",
          "link": "https://www.google.com/search?q=Zoo",
          "image": "https://encrypted-tbn0.gstatic.com/images?q=..."
        }
      ]
    },
    "organic_results": [
      {
        "position": 1,
        "title": "Zoo Aquarium de Madrid | Official Website",
        "link": "https://www.zooaquariummadrid.com/en/",
        "redirect_link": "https://www.google.com/url?url=https://www.zooaquariummadrid.com/en/",
        "displayed_link": "https://www.zooaquariummadrid.com › en",
        "favicon": "https://www.zooaquariummadrid.com/favicon.ico",
        "snippet": "Visit Zoo Aquarium de Madrid, one of the most important zoos in the world. Home to over 6,000 animals from 500 different species. Book your tickets online!",
        "snippet_highlighted_words": [
          "Zoo Aquarium de Madrid",
          "zoos",
          "animals",
          "species",
          "tickets"
        ],
        "sitelinks": {
          "inline": [
            {
              "title": "Buy Tickets",
              "link": "https://www.zooaquariummadrid.com/en/tickets"
            },
            {
              "title": "Animals",
              "link": "https://www.zooaquariummadrid.com/en/animals"
            },
            {
              "title": "Plan Your Visit",
              "link": "https://www.zooaquariummadrid.com/en/plan-your-visit"
            },
            {
              "title": "Shows",
              "link": "https://www.zooaquariummadrid.com/en/shows"
            }
          ]
        },
        "cached_page_link": "https://webcache.googleusercontent.com/search?q=cache:...",
        "related_pages_link": "https://www.google.com/search?q=related:..."
      },
      {
        "position": 2,
        "title": "Zoo Aquarium de Madrid - All You Need to Know BEFORE You Go",
        "link": "https://www.tripadvisor.com/Attraction_Review-g187514-d243998-Reviews-Zoo_Aquarium_de_Madrid-Madrid.html",
        "redirect_link": "https://www.google.com/url?url=https://www.tripadvisor.com/...",
        "displayed_link": "https://www.tripadvisor.com › ... › Madrid › Things to Do in Madrid",
        "favicon": "https://www.tripadvisor.com/favicon.ico",
        "snippet": "Zoo Aquarium de Madrid: See 3,847 reviews, articles, and photos of Zoo Aquarium de Madrid, ranked No.47 on Tripadvisor among 484 attractions in Madrid.",
        "snippet_highlighted_words": [
          "Zoo Aquarium de Madrid",
          "reviews",
          "photos",
          "attractions in Madrid"
        ],
        "rich_snippet": {
          "top": {
            "detected_extensions": {
              "rating": 4,
              "reviews": 3847,
              "price": "€€-€€€"
            }
          }
        }
      },
      {
        "position": 3,
        "title": "Madrid Zoo Aquarium - Wikipedia",
        "link": "https://en.wikipedia.org/wiki/Madrid_Zoo_Aquarium",
        "redirect_link": "https://www.google.com/url?url=https://en.wikipedia.org/wiki/Madrid_Zoo_Aquarium",
        "displayed_link": "https://en.wikipedia.org › wiki › Madrid_Zoo_Aquarium",
        "favicon": "https://en.wikipedia.org/favicon.ico",
        "snippet": "Zoo Aquarium de Madrid is a 20-hectare (49-acre) zoo and aquarium located in the Casa de Campo in Madrid, Spain. The zoo is property of the city council...",
        "snippet_highlighted_words": [
          "Zoo Aquarium de Madrid",
          "zoo",
          "aquarium",
          "Casa de Campo",
          "Madrid, Spain"
        ],
        "cached_page_link": "https://webcache.googleusercontent.com/search?q=cache:..."
      },
      {
        "position": 4,
        "title": "Zoo Aquarium Madrid | Spain Tourism",
        "link": "https://www.esmadrid.com/en/tourist-information/zoo-aquarium-madrid",
        "redirect_link": "https://www.google.com/url?url=https://www.esmadrid.com/...",
        "displayed_link": "https://www.esmadrid.com › tourist-information",
        "favicon": "https://www.esmadrid.com/favicon.ico",
        "snippet": "The Madrid Zoo Aquarium is home to over 6,000 animals from 500 species. Visit the giant pandas, koalas, and enjoy the dolphin shows. Open daily.",
        "snippet_highlighted_words": [
          "Madrid Zoo Aquarium",
          "animals",
          "species",
          "giant pandas",
          "dolphin shows"
        ]
      },
      {
        "position": 5,
        "title": "Madrid Zoo Aquarium Tickets - Tiqets",
        "link": "https://www.tiqets.com/en/madrid-attractions/zoo-aquarium-madrid/",
        "redirect_link": "https://www.google.com/url?url=https://www.tiqets.com/...",
        "displayed_link": "https://www.tiqets.com › madrid-attractions",
        "favicon": "https://www.tiqets.com/favicon.ico",
        "snippet": "Book your Zoo Aquarium Madrid tickets online and skip-the-line! Save time and money with our best price guarantee ▻ make the most of your visit to Madrid!",
        "snippet_highlighted_words": [
          "Zoo Aquarium Madrid tickets",
          "skip-the-line",
          "Save time"
        ],
        "rich_snippet": {
          "top": {
            "detected_extensions": {
              "price_range": "From €17.90",
              "rating": 4.5,
              "reviews": 892
            }
          }
        }
      }
    ],
    "related_searches": [
      {
        "query": "zoo aquarium madrid tickets",
        "link": "https://www.google.com/search?q=zoo+aquarium+madrid+tickets"
      },
      {
        "query": "zoo aquarium madrid prices",
        "link": "https://www.google.com/search?q=zoo+aquarium+madrid+prices"
      },
      {
        "query": "zoo aquarium madrid opening hours",
        "link": "https://www.google.com/search?q=zoo+aquarium+madrid+opening+hours"
      },
      {
        "query": "madrid zoo animals list",
        "link": "https://www.google.com/search?q=madrid+zoo+animals+list"
      },
      {
        "query": "madrid zoo pandas",
        "link": "https://www.google.com/search?q=madrid+zoo+pandas"
      },
      {
        "query": "madrid zoo map",
        "link": "https://www.google.com/search?q=madrid+zoo+map"
      },
      {
        "query": "parque warner madrid",
        "link": "https://www.google.com/search?q=parque+warner+madrid"
      },
      {
        "query": "faunia madrid",
        "link": "https://www.google.com/search?q=faunia+madrid"
      }
    ],
    "pagination": {
      "current": 1,
      "next": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&start=10",
      "other_pages": {
        "2": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&start=10",
        "3": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&start=20",
        "4": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&start=30",
        "5": "https://www.google.com/search?q=Zoo+Aquarium+de+Madrid&start=40"
      }
    },
    "serpapi_pagination": {
      "current": 1,
      "next_link": "https://serpapi.com/search.json?q=Zoo+Aquarium+de+Madrid&start=10",
      "next": "https://serpapi.com/search.json?q=Zoo+Aquarium+de+Madrid&start=10",
      "other_pages": {
        "2": "https://serpapi.com/search.json?q=Zoo+Aquarium+de+Madrid&start=10",
        "3": "https://serpapi.com/search.json?q=Zoo+Aquarium+de+Madrid&start=20"
      }
    }
  };

  return NextResponse.json(serpApiResponse, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}