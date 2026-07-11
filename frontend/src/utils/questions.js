export const QUESTIONS_DB = {
  Technical: {
    OOPS: {
      Easy:   ["What is OOP?","What is Encapsulation?","What is Inheritance?","What is Polymorphism?","What is Abstraction?"],
      Medium: ["Explain constructor overloading.","Difference between overloading and overriding?","What is virtual function?","What is multiple inheritance?","What is dynamic binding?"],
      Hard:   ["Difference between abstract class and interface?","Explain SOLID principles.","What is diamond problem?","Explain dependency injection.","Explain design patterns."]
    },
    CN: {
      Easy:   ["What is Computer Network?","What is IP Address?","What is LAN and WAN?","What is Router?","What is MAC Address?"],
      Medium: ["Explain OSI Model.","Difference between TCP and UDP?","What is DNS?","What is HTTP and HTTPS?","What is Subnet Mask?"],
      Hard:   ["Explain Congestion Control.","What is Sliding Window Protocol?","Explain ARP protocol.","What is BGP?","Explain routing algorithms."]
    },
    DBMS: {
      Easy:   ["What is DBMS?","What is Primary Key?","What is Foreign Key?","What is SQL?","What is a Table?"],
      Medium: ["Explain Normalization.","What is Indexing?","Difference between DELETE and TRUNCATE?","What is ER Diagram?","What are different types of JOIN?"],
      Hard:   ["Explain ACID properties.","What is Transaction Management?","What is Deadlock in DBMS?","Explain Two Phase Locking.","What is a Distributed Database?"]
    },
    WebDev: {
      Easy:   ["What is HTML?","What is CSS?","What is JavaScript?","What is the DOM?","What is Responsive Design?"],
      Medium: ["What is REST API?","Explain React component lifecycle.","What is Node.js?","What is Express.js?","What is JSON?"],
      Hard:   ["What is JWT?","Explain Authentication vs Authorization.","What is CORS and how do you fix it?","Explain XSS and CSRF attacks.","What is Server Side Rendering?"]
    },
    DSA: {
      Easy:   ["What is an Array?","What is a Stack?","What is a Queue?","What is a Linked List?","What is Linear Search?"],
      Medium: ["Explain Binary Search.","What is Recursion?","Explain Merge Sort.","What is a Binary Tree?","What is Hashing?"],
      Hard:   ["Explain Time and Space Complexity.","What is Dynamic Programming?","Explain Dijkstra's Algorithm.","What is a Greedy Algorithm?","What is Backtracking?"]
    },
    OS: {
      Easy:   ["What is an Operating System?","What is a Process?","What is a Thread?","What is CPU Scheduling?","What is the Kernel?"],
      Medium: ["Explain Deadlock and its conditions.","What is Multithreading?","Explain Paging.","What is Context Switching?","What is a Semaphore?"],
      Hard:   ["Explain Paging vs Segmentation.","What is Virtual Memory?","Explain Banker's Algorithm.","What is Thrashing?","Explain Memory Management techniques."]
    }
  },
  HR: [
    "Tell me about yourself.",
    "Why should we hire you?",
    "What is your greatest strength?",
    "What is your biggest weakness?",
    "Where do you see yourself in 5 years?",
    "Why do you want to work here?",
    "Describe a situation where you showed leadership.",
    "How do you handle work pressure?",
    "What motivates you?",
    "Tell me about a time you failed and what you learned."
  ],
  Behavioral: [
    "Describe a challenging project and how you handled it.",
    "Tell me about a time you worked in a team.",
    "Describe a situation where you had to meet a tight deadline.",
    "Tell me about a conflict with a colleague and how you resolved it.",
    "Describe a time you took initiative without being asked.",
    "Tell me about a time you had to learn something quickly.",
    "Describe a situation where you had to persuade someone.",
    "Tell me about your biggest achievement so far.",
    "Describe a time you received critical feedback.",
    "Tell me about a time you went above and beyond."
  ]
};

export function getQuestions(type, subject, difficulty) {
  if (type === "Technical") {
    return QUESTIONS_DB.Technical?.[subject]?.[difficulty] || [];
  }
  return QUESTIONS_DB[type] || [];
}
