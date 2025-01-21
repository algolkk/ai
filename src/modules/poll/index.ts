import { bindThis } from '@/decorators.js';
import Message from '@/message.js';
import Module from '@/module.js';
import serifs from '@/serifs.js';
import { genItem } from '@/vocabulary.js';
import config from '@/config.js';
import type { Note } from '@/misskey/note.js';

export default class extends Module {
	public readonly name = 'poll';

	@bindThis
	public install() {
		setInterval(() => {
			if (Math.random() < 0.1) {
				this.post();
			}
		}, 1000 * 60 * 60);

		return {
			mentionHook: this.mentionHook,
			timeoutCallback: this.timeoutCallback,
		};
	}

	@bindThis
	private async post() {
		const duration = 1000 * 60 * 15;

		const polls = [ // TODO: Extract serif
			['珍しそうなもの', 'どれが一番珍しいと思いますかにゃ？'],
			['美味しそうなもの', 'どれが一番美味しそうですにゃ？'],
			['重そうなもの', 'どれが一番重いと思いますにゃ？持ち上げるの大変そうですにゃ'],
			['欲しいもの', 'どれが一番欲しいですかにゃ？'],
			['無人島に持っていきたいもの', '無人島に一つだけ持っていけるとしたら、どれを選びますにゃ？'],
			['家に飾りたいもの', 'お家に飾るとしたらどれが素敵ですかにゃ？'],
			['売れそうなもの', 'どれが一番売れそうだと思いますかにゃ？'],
			['降ってきてほしいもの', 'お空からどれが降ってきたら嬉しいですかにゃ？'],
			['携帯したいもの', 'どれをいつも持ち歩きたいですかにゃ？'],
			['商品化したいもの', 'どれを商品化したら面白そうですかにゃ？'],
			['発掘されそうなもの', '遺跡から発掘されそうなのはどれだと思いますかにゃ？'],
			['良い香りがしそうなもの', 'どれが一番良い香りがしそうですかにゃ？くんくん'],
			['高値で取引されそうなもの', 'どれが一番高値で取引されそうですかにゃ？'],
			['地球周回軌道上にありそうなもの', 'どれが地球の周りをふわふわ漂っていそうですかにゃ？'],
			['プレゼントしたいもの', '私にプレゼントしてくださるとしたら、どれを選んでいただけますかにゃ？'],
			['プレゼントされたいもの', 'プレゼントでいただけるとしたら、どれが嬉しいですかにゃ？'],
			['私が持ってそうなもの', 'この中で私が持っていそうなものはどれだと思いますかにゃ？'],
			['流行りそうなもの', 'どれが流行りそうだと思いますかにゃ？'],
			['朝ごはん', '朝ごはんにはどれが食べたいですかにゃ？'],
			['お昼ごはん', 'お昼ごはんにはどれが美味しそうですかにゃ？'],
			['お夕飯', '夕ごはんにはどれが良さそうですかにゃ？'],
			['体に良さそうなもの', 'どれが一番体に良さそうだと思いますかにゃ？'],
			['後世に遺したいもの', 'どれを後世に残していきたいですかにゃ？'],
			['楽器になりそうなもの', 'どれが素敵な楽器になりそうですかにゃ？'],
			['お味噌汁の具にしたいもの', 'お味噌汁のお具にするならどれが美味しそうですかにゃ？'],
			['ふりかけにしたいもの', 'どれをごはんにふりかけたら美味しそうですかにゃ？'],
			['よく見かけるもの', 'どれを一番よく見かけますかにゃ？'],
			['道に落ちてそうなもの', 'お散歩中に道端で見かけそうなのはどれですかにゃ？'],
			['美術館に置いてそうなもの', '美術館でどれが展示されていそうですかにゃ？'],
			['教室にありそうなもの', '教室にありそうなのはどれですかにゃ？'],
			['絵文字になってほしいもの', 'どれを絵文字にしたら可愛いですかにゃ？'],
			['Misskey本部にありそうなもの', 'Misskey本部にあったら面白そうなのはどれですかにゃ？'],
			['燃えるゴミ', 'どれが燃えるゴミだと思いますかにゃ？分別は大切ですにゃ！'],
			['好きなおにぎりの具', 'おにぎりの具は何が好きですかにゃ？私は鮭が好きですにゃ♪']
		];

		const poll = polls[Math.floor(Math.random() * polls.length)];

		const choices = [
			genItem(),
			genItem(),
			genItem(),
			genItem(),
		];

		const note = await this.ai.post({
			text: poll[1],
			poll: {
				choices,
				expiredAfter: duration,
				multiple: false,
			}
		});

		// タイマーセット
		this.setTimeoutWithPersistence(duration + 3000, {
			title: poll[0],
			noteId: note.id,
		});
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (!msg.or(['/poll']) || msg.user.username !== config.master) {
			return false;
		} else {
			this.log('Manualy poll requested');
		}

		this.post();

		return true;
	}

	@bindThis
	private async timeoutCallback({ title, noteId }) {
		const note: Note = await this.ai.api('notes/show', { noteId });

		const choices = note.poll!.choices;

		let mostVotedChoice;

		for (const choice of choices) {
			if (mostVotedChoice == null) {
				mostVotedChoice = choice;
				continue;
			}

			if (choice.votes > mostVotedChoice.votes) {
				mostVotedChoice = choice;
			}
		}

		const mostVotedChoices = choices.filter(choice => choice.votes === mostVotedChoice.votes);

		if (mostVotedChoice.votes === 0) {
			this.ai.post({ // TODO: Extract serif
				text: '投票はありませんでした',
				renoteId: noteId,
			});
		} else if (mostVotedChoices.length === 1) {
			this.ai.post({ // TODO: Extract serif
				cw: `${title}アンケートの結果発表ですにゃ！`,
				text: `結果は${mostVotedChoice.votes}票の「${mostVotedChoice.text}ですにゃ！`,
				renoteId: noteId,
			});
		} else {
			const choices = mostVotedChoices.map(choice => `「${choice.text}」`).join('と');
			this.ai.post({ // TODO: Extract serif
				cw: `${title}アンケートの結果発表ですにゃ！`,
				text: `結果は${mostVotedChoice.votes}票の${choices}ですにゃ！`,
				renoteId: noteId,
			});
		}
	}
}
