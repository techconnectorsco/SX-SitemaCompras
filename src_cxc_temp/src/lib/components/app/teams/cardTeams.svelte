<script lang="ts">
  /**
   * @module CardTeams
   * @description This component displays a collection of team cards, each representing a project or initiative.
   * Each card shows project details, associated tags, and team members, along with a menu for team actions.
   */
    import * as Card from '$lib/components/ui/card';
	import Badge from '$lib/components/ui/badge/badge.svelte';
    import { Button } from "$lib/components/ui/button";
    import * as Avatar from '$lib/components/ui/avatar/';
	import CardMenu from './cardMenu.svelte';

    /**
     * An array of member objects, used to display team members on project cards.
     * @constant
     * @type {Array<object>}
     * @property {number} id - Unique identifier for the member.
     * @property {string} name - The full name of the member.
     * @property {string} username - The username of the member.
     * @property {string} imageUrl - The URL of the member's profile image.
     * @property {boolean} connect - Indicates the connection status of the member (true for connected, false for unconnect).
     */
    const members = [
  {
    id: 1,
    name: "Anna Richards",
    username: "Annrchds",
    imageUrl: "https://images.unsplash.com/photo-1670272505340-d906d8d77d03?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=320&h=320&q=80",
    connect: true
  },
  {
    id: 2,
    name: "Michael Johnson",
    username: "Mjohnson",
    imageUrl: "https://images.unsplash.com/photo-1601935111741-ae98b2b230b0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=320&h=320&q=80",
    connect: false
  },
  {
    id: 3,
    name: "Emily Wilson",
    username: "Emwilson",
    imageUrl: "https://images.unsplash.com/photo-1659482634023-2c4fda99ac0c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=320&h=320&q=80",
    connect: true
  },
  {
    id: 4,
    name: "David Smith",
    username: "Davidsm",
    imageUrl: "https://images.unsplash.com/photo-1659482633369-9fe69af50bfb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=3&w=320&h=320&q=80",
    connect: false
  },
  {
    id: 5,
    name: "Sarah Brown",
    username: "Sbrown",
    imageUrl: "https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=320&h=320&q=80",
    connect: true
  },
  {
    id: 6,
    name: "James Davis",
    username: "Jdavis",
    imageUrl: "https://github.com/shadcn.png",
    connect: false
  },
];

/**
 * An array of item (project/team) objects to be displayed as cards.
 * @constant
 * @type {Array<object>}
 * @property {string} title - The title of the item.
 * @property {string} description - A brief description of the item.
 * @property {string[]} tags - An array of tags associated with the item.
 * @property {string} imageUrl - The URL of the image representing the item.
 * @property {number[]} membersId - An array of IDs corresponding to the members associated with this item.
 */
const items = [
  {
    title: "Project Alpha",
    description: "This project is focused on developing new web technologies.",
    tags: ["Tech", "Innovation", "Web"],
    imageUrl: "https://images.unsplash.com/photo-1671726203422-dd710fd8a72d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [6,]
  },
  {
    title: "Marketing Campaign",
    description: "Strategies for effective online marketing campaigns.",
    tags: ["Marketing", "Sales", "Growth"],
    imageUrl: "https://images.unsplash.com/photo-1635776062360-af423602aff3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [4, 5, 6]
  },
  {
    title: "Software Development",
    description: "Software development process for enterprise level applications.",
    tags: ["Development", "Software", "Enterprise"],
    imageUrl: "https://images.unsplash.com/photo-1671726203422-dd710fd8a72d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [1, 2,]
},
  {
    title: "Data Analysis",
    description: "Techniques and tools for advanced data analysis.",
    tags: ["Data", "Analytics", "Research"],
    imageUrl: "https://images.unsplash.com/photo-1661956602153-23384936a1d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [1, 2, 3, 4]
},
  {
    title: "HR Management",
    description: "Modern HR management tactics and strategies.",
    tags: ["HR", "Management", "Tactics"],
    imageUrl: "https://images.unsplash.com/photo-1661956602153-23384936a1d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [1, 2, 3, 4, 5, 6]
},
  {
    title: "Blockchain Solutions",
    description: "Developing decentralized applications using blockchain technology.",
    tags: ["Blockchain", "DApps"],
    imageUrl: "https://images.unsplash.com/photo-1671726203422-dd710fd8a72d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [2, 4, 5, 6, 1]
},
  {
    title: "AI Development",
    description: "Artificial intelligence and its applications in industry.",
    tags: ["AI", "Machine Learning"],
    imageUrl: "https://images.unsplash.com/photo-1661956602153-23384936a1d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [1, 3, 6]
},
  {
    title: "Network Security",
    description: "Enhancing cybersecurity measures for corporate networks.",
    tags: ["Security", "Network",],
    imageUrl: "https://images.unsplash.com/photo-1635776062360-af423602aff3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [5, 6]
},
  {
    title: "Cloud Computing",
    description: "Expanding cloud infrastructure to provide scalable solutions.",
    tags: ["Cloud", "Infrastructure", "Scalability"],
    imageUrl: "https://images.unsplash.com/photo-1661956602153-23384936a1d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [4,]
},
  {
    title: "Virtual Reality",
    description: "Creating immersive experiences using VR technologies.",
    tags: ["VR", "Gaming", "3D Modeling"],
    imageUrl: "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80",
    membersId: [3, 4]
  }
];


</script>
  
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
    {#each items as item}
      <Card.Root class="rounded-xl shadow-lg overflow-hidden">
        <Card.Header class="flex flex-col mb-1">
          <img class="w-full rounded-t-lg" src={item.imageUrl} alt={`Image for ${item.title}`}>
          <div class="p-4">
            <Card.Title class='text-lg font-semibold flex justify-between items-center'>
              {item.title}
              <CardMenu />
            </Card.Title>
            <Card.Description class="text-sm mt-2">
              {item.description}
            </Card.Description>
            <div class="flex mt-2">
              {#each item.tags as tag}
                <Badge variant='secondary'>{tag}</Badge>
              {/each}
            </div>
          </div>
        </Card.Header>
        <Card.Content>
          <div class="flex items-center">
            <h4 class="text-xs mr-2">MEMBERS:</h4>
            <div class="flex -space-x-2 ml-auto">
              {#each item.membersId ?? [] as memberId}
                {#each members as member}
                  {#if member.id === memberId}
                    <Avatar.Root class='w-8 h-8'>
                      <Avatar.Image src={member.imageUrl} alt={member.username} />
                      <Avatar.Fallback>{member.username.slice(0, 2)}</Avatar.Fallback>
                    </Avatar.Root>
                  {/if}
                {/each}
              {/each}
            </div>
          </div>
        </Card.Content>
        <Card.Footer class='flex items-center justify-between p-4'>
          <Button variant='outline' size='sm' class='w-full'>Leave Team</Button>
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>
  