import {
  ButtonInteraction,
  Client,
  Interaction,
  Message,
  MessageEmbed,
  MessageEmbedOptions,
  PartialMessage,
  Snowflake,
} from 'discord.js';
import { Utils } from '../../utils';

export namespace ImageViewer {
  export function initialize(bot: Client): void {
    bot.on('messageCreate', message => resolveMessage(message));
    bot.on('messageUpdate', (oldMessage, newMessage) => {
      resolveUpdatedMessage(oldMessage, newMessage);
    });

    bot.on('interactionCreate', interaction => resolveButton(interaction));
  }

  type LaxMessage = Message | PartialMessage;

  const responsedMessageIds: Set<Snowflake> = new Set;

  function resolveMessage(message: LaxMessage): void {
    if (!countHiddenImages(message)) return;

    sendViewerMessage(message)
      .then(() => responsedMessageIds.add(message.id))
      .catch(console.error);
  }

  function resolveUpdatedMessage(
    oldMessage: LaxMessage, newMessage: LaxMessage
  ): void {
    if (!responsedMessageIds.has(oldMessage.id)) resolveMessage(newMessage);
  }

  const prefixes = {
    viewImages: 'ViewImages',
    deleteSelf: 'DeleteSelf',
  };

  function resolveButton(interaction: Interaction): void {
    if (!interaction.isButton()) return;

    const { prefix, args } = Utils.parseCustomId(interaction.customId);

    if (prefix === prefixes.viewImages)
      sendViewImages(interaction, args)
        .catch(console.error);
    if (prefix === prefixes.deleteSelf)
      deleteViewerMessage(interaction, args)
        .catch(console.error);
  }

  function countHiddenImages(message: LaxMessage): number {
    return collectImageURLsChunks(message)
      .reduce((count, urls) => count + urls.length - 1, 0);
  }

  function collectImageURLsChunks(message: LaxMessage): string[][] {
    const embeds: (MessageEmbed | null)[] = message.embeds.slice();

    return message.embeds.reduce((chunks, targetEmbed, i) => {
      if (!embeds[i]) return chunks;

      const urls = embeds.reduce((urls, embed, i) => {
        if (!embed?.image || targetEmbed.url !== embed.url) return urls;

        embeds[i] = null;
        return urls.concat(embed.image.url);
      }, [] as string[]);

      return urls.length ? chunks.concat([urls]) : chunks;
    }, [] as string[][]);
  }

  async function sendViewerMessage(laxMessage: LaxMessage): Promise<void> {
    const message = await laxMessage.fetch();

    await message.channel.send({
      content: '画像はこのチャンネルの一番下に表示されます',
      components: [
        {
          type: 'ACTION_ROW',
          components: [
            {
              type: 'BUTTON',
              style: 'SUCCESS',
              label: 'すべての画像を表示',
              customId: Utils.generateCustomId(
                prefixes.viewImages, [message.id]
              ),
            },
            {
              type: 'BUTTON',
              style: 'DANGER',
              label: '削除',
              customId: Utils.generateCustomId(
                prefixes.deleteSelf, [message.author.id]
              ),
            },
          ],
        },
      ],
    });
  }

  const imageEmbedColors: number[] = [
    0x00bb9f,
    0xf7503f,
    0x00cb7b,
    0xf38033,
    0x0097d6,
    0xf8c53f,
    0xa45ab1,
    0xfa2961,
  ];

  async function sendViewImages(
    interaction: ButtonInteraction, args: string[]
  ): Promise<void> {
    const channelId = interaction.channelId;
    if (!channelId) return failButtonInteraction(interaction);

    const message = await Utils.fetchMessage(
      interaction.client, channelId, args[0]
    );
    if (!message)
      return interaction.reply({
        ephemeral: true,
        content: '⚠️ **対象のメッセージが見つかりません**',
      });

    if (!countHiddenImages(message))
      return interaction.reply({
        ephemeral: true,
        content: '⚠️ **非表示となる画像が見つかりません**',
      });

    const chunks = collectImageURLsChunks(message);
    const embeds = chunks.reduce((embeds, urls, i) => (
      embeds.concat(
        urls.map((url, page) => ({
          color: imageEmbedColors[i],
          image: { url },
          footer: { text: `${page + 1}/${urls.length}` },
        }))
      )
    ), [] as MessageEmbedOptions[]);

    return interaction.reply({ ephemeral: true, embeds });
  }

  function deleteViewerMessage(
    interaction: ButtonInteraction, args: string[]
  ): Promise<void> {
    const channelId = interaction.channelId;
    if (!channelId) return failButtonInteraction(interaction);

    if (interaction.user.id === args[0])
      return Utils.deleteMessage(
        interaction.client, channelId, interaction.message.id
      );

    return interaction.reply({
      ephemeral: true,
      content: '⚠️ **このメッセージを削除できるのはメッセージの投稿者のみです**',
    });
  }

  function failButtonInteraction(
    interaction: ButtonInteraction
  ): Promise<void> {
    return interaction.reply({
      ephemeral: true,
      content: '⚠️ **不明なエラーが発生しました**',
    });
  }
}
